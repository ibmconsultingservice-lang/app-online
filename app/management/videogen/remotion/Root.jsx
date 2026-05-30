import { Composition } from 'remotion'
import VideoComposition from './VideoComposition'
import script from './script.json'

export const RemotionRoot = () => {
  // Supporte les deux formats : scenes (VideoGen) et slides (DeckGen)
  const scenes = script.scenes || script.slides || []
  const totalFrames = script.totalFrames || (scenes.length * 90)

  return (
    <Composition
      id="VisualGen"
      component={VideoComposition}
      durationInFrames={totalFrames}
      fps={script.fps || 30}
      width={1280}
      height={720}
      defaultProps={{
        scenes,
        accentColor: script.accentColor || script.accent || '#f59e0b',
        productImageUrl: null,
      }}
    />
  )
}