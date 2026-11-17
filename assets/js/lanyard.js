/**
 * Live Discord Status and Spotify Integration via Lanyard API
 * Connects via WebSocket for real-time presence updates,
 * with automatic heartbeat, reconnection, and REST API fallback.
 */

const LANYARD_DISCORD_ID = '559996761419284480';
const LANYARD_WS_URL = 'wss://api.lanyard.rest/socket';
const LANYARD_REST_URL = `https://api.lanyard.rest/v1/users/${LANYARD_DISCORD_ID}`;

let lanyardSocket = null;
let heartbeatInterval = null;
let isInitialized = false;

/**
 * Updates DOM elements based on Lanyard presence payload
 * @param {Object|null} data - Discord presence data
 */
function updatePresenceUI(data) {
  const dot = document.getElementById('discord-status-dot');
  const text = document.getElementById('discord-status-text');
  const spotifyBadge = document.getElementById('spotify-badge');
  const spotifySong = document.getElementById('spotify-song');
  const spotifyArtist = document.getElementById('spotify-artist');
  const footerDiscordLink = document.querySelector('a[title="Discord"]');

  if (!dot || !text) return;

  // Handle missing or unmonitored user data
  if (!data || !data.discord_status) {
    dot.className = 'status-dot status-offline';
    text.textContent = 'Discord Offline';
    if (spotifyBadge) spotifyBadge.style.display = 'none';
    return;
  }

  const status = data.discord_status;

  // Update status dot class
  dot.className = `status-dot status-${status}`;

  // Update status label
  const statusLabels = {
    online: 'Online on Discord',
    idle: 'Away on Discord',
    dnd: 'Do Not Disturb',
    offline: 'Discord Offline'
  };

  const label = statusLabels[status] || 'Discord Offline';
  text.textContent = label;

  // Update tooltip on footer discord icon
  if (footerDiscordLink) {
    footerDiscordLink.title = `Discord: ${label}`;
  }

  // Update Spotify live playback
  if (spotifyBadge && spotifySong && spotifyArtist) {
    if (data.listening_to_spotify && data.spotify) {
      spotifyBadge.style.display = 'inline-flex';
      spotifySong.textContent = data.spotify.song || 'Unknown Track';
      spotifyArtist.textContent = data.spotify.artist || 'Unknown Artist';

      if (data.spotify.track_id) {
        spotifyBadge.href = `https://open.spotify.com/track/${data.spotify.track_id}`;
      } else {
        spotifyBadge.href = '#';
      }
    } else {
      spotifyBadge.style.display = 'none';
    }
  }
}

/**
 * Fallback to REST API if WebSocket is unavailable
 */
async function fetchLanyardRest() {
  try {
    const response = await fetch(LANYARD_REST_URL);
    if (!response.ok) return;
    const json = await response.json();
    if (json.success && json.data) {
      updatePresenceUI(json.data);
    }
  } catch (err) {
    // Graceful degradation when network/API is unreachable
    console.debug('Lanyard REST fallback check:', err.message);
  }
}

/**
 * Connects to Lanyard WebSocket gateway
 */
function connectLanyardSocket() {
  if (lanyardSocket && (lanyardSocket.readyState === WebSocket.OPEN || lanyardSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    lanyardSocket = new WebSocket(LANYARD_WS_URL);

    lanyardSocket.onopen = () => {
      // Socket connection established, waiting for Hello (Opcode 1)
    };

    lanyardSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { op, t, d } = payload;

        // Opcode 1: Hello - set up heartbeat and subscribe
        if (op === 1) {
          const interval = d.heartbeat_interval || 30000;
          if (heartbeatInterval) clearInterval(heartbeatInterval);

          heartbeatInterval = setInterval(() => {
            if (lanyardSocket && lanyardSocket.readyState === WebSocket.OPEN) {
              lanyardSocket.send(JSON.stringify({ op: 3 }));
            }
          }, interval);

          // Subscribe to target Discord ID
          lanyardSocket.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: LANYARD_DISCORD_ID }
          }));
        }

        // Opcode 0: Dispatch events
        if (op === 0) {
          if (t === 'INIT_STATE') {
            const userData = d[LANYARD_DISCORD_ID];
            updatePresenceUI(userData);
          } else if (t === 'PRESENCE_UPDATE') {
            updatePresenceUI(d);
          }
        }
      } catch (e) {
        console.debug('Lanyard payload parse error:', e);
      }
    };

    lanyardSocket.onclose = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      // Attempt REST fallback and reconnect after 6 seconds
      fetchLanyardRest();
      setTimeout(connectLanyardSocket, 6000);
    };

    lanyardSocket.onerror = () => {
      if (lanyardSocket) lanyardSocket.close();
    };
  } catch (err) {
    console.debug('Lanyard WebSocket init error:', err);
    setTimeout(connectLanyardSocket, 6000);
  }
}

/**
 * Initializes Lanyard service once components are mounted
 */
function initLanyard() {
  if (isInitialized) return;
  isInitialized = true;

  // Immediate REST attempt for instant visual feedback
  fetchLanyardRest();

  // Establish persistent real-time socket
  connectLanyardSocket();
}

// Hook into component loader lifecycle
document.addEventListener('componentsLoaded', initLanyard);

// Fallback in case components were loaded before script executed
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (document.getElementById('discord-status-dot')) {
    initLanyard();
  }
}
