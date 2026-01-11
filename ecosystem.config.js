module.exports = {
  apps: [{
    name: 'plotpoint-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1, // Next.js should run in single instance for production build
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Restart strategies
    min_uptime: '10s',
    max_restarts: 10,
    // Environment variables
    merge_logs: true,
  }]
};

