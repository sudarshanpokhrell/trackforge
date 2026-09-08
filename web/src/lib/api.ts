import ky from 'ky'

export const api = ky.create({
  prefix: '/api/v1',
  timeout: 10000, 
  retry: {
    limit: 2, 
  },
})