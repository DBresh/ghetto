```ehh shooter
ehh shooter
├── package.json    # Node dependencies (express, socket.io)
├── shared/         # Code used by BOTH server and client
│ └── constants.js  # Map dimensions, player speed, bullet speed, fire rate
├── server/         # The Authoritative Backend
│ ├── server.js     # Entry point: Express app and Socket.io setup
│ ├── game.js       # The main game loop: updates positions, checks collisions
│ ├── player.js     # Player data structure (x, y, score, health/stun state)
│ └── projectile.js # Bullet data structure and trajectory math
└── public/         # The Client-side (served to the browser)
├── index.html      # The DOM structure (menus, scoreboards, game arena)
├── css/
│ └── style.css     # UI styling and absolute positioning for game entities
└── js/
├── main.js         # The requestAnimationFrame loop and Socket listeners
├── input.js        # Tracks KeyDown/KeyUp and Mouse clicks/position
├── state.js        # Stores the latest snapshot of the game sent by the server
└── render.js       # Purely updates DOM `transform: translate()` based on state.js
```
