import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    poolOptions: {
      threads: {
        execArgv: ['--no-experimental-webstorage'],
      },
      forks: {
        execArgv: ['--no-experimental-webstorage'],
      },
    },
  },
})
