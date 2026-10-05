import { config } from '@/config'
import { ApiVideoProvider } from './apiVideoProvider'
import { MockVideoProvider } from './mockVideoProvider'
import type { VideoProvider } from './VideoProvider'

export type { VideoProvider } from './VideoProvider'

function createVideoProvider(): VideoProvider {
  if (config.videoProvider === 'api' && config.apiBaseUrl) return new ApiVideoProvider(config.apiBaseUrl)
  return new MockVideoProvider()
}

export const videoProvider: VideoProvider = createVideoProvider()
