module.exports = {
    apps: [{
      name: 'prompt-generator',
      script: 'prompt.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }]
  }