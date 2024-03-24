import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  initScene,
  create,
  randomList,
  updateInstanceAttribute,
  toVector3,
  groupArrayBy
} from '../util/util'
import {
  BoxHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  Points,
  PointsMaterial,
  RawShaderMaterial,
  ShaderMaterial,
  Vector2,
  Vector3
} from 'three'
import { EffectComposer } from 'three/examples/jsm/Addons.js'
import _ from 'lodash'
import { Num } from 'pts'
import vertexShader from './v.vert?raw'
import fragmentShader from './f.frag?raw'
import * as easings from 'd3-ease'
import { useMemo, useRef } from 'react'
import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { useInterval } from '../util/util'

const c = {
  INSTANCES: window.innerWidth,
  // INSTANCES: 1,
  POINTS: 100,
  JITTER: 0.5
}

export default function Lines() {
  return (
    <Canvas className='!h-full !w-full' gl={{ preserveDrawingBuffer: true }}>
      <Scene />
    </Canvas>
  )
}

function Scene() {
  const assembleBufferGeometry = (e: InstancedBufferGeometry) => {
    e.instanceCount = c.INSTANCES
    e.setFromPoints(_.range(c.POINTS).map(() => new Vector3()))

    e.setAttribute(
      'progress',
      new BufferAttribute(
        new Float32Array(_.range(c.POINTS).map(x => x / c.POINTS)),
        1
      )
    )

    e.setAttribute(
      'random',
      new InstancedBufferAttribute(
        new Float32Array(randomList(c.INSTANCES * c.POINTS)),
        1
      )
    )

    e.setAttribute(
      'splinePoints',
      create(
        new InstancedBufferAttribute(
          new Float32Array(
            _.sortBy(
              _.range(8 * c.INSTANCES).map(() =>
                Num.randomPt([-1, -1], [1, 1])
              ),
              x => x.x + x.y * -1 + _.random(c.JITTER) * -1
            ).flatMap(x => x.toArray())

            // _.range(8 * c.INSTANCES)
            //   .map(() => Num.randomPt([0, -1], [1, 1]))
            //   .flatMap(x => x.toArray())
          ),
          16
        ),
        e => {
          for (let i = 0; i < c.INSTANCES; i++) {
            updateInstanceAttribute(e, i, array => {
              const vec2s = groupArrayBy(array, 2)
              return _.sortBy(vec2s, ([x, y]) => x).flat()
            })
          }
        }
      )
    )

    e.setAttribute(
      'instanceMatrix',
      create(
        new InstancedBufferAttribute(new Float32Array(c.INSTANCES * 16), 16),
        e => {
          for (let i = 0; i < c.INSTANCES; i++) {
            updateInstanceAttribute(
              e,
              i,
              () =>
                create(new Matrix4(), e => {
                  // e.setPosition(
                  //   toVector3(Num.randomPt([-1, -1, 0], [1, 1, 0]))
                  // )
                }).elements
            )
          }
        }
      )
    )
  }

  const isRecording = useRef<boolean>(false)

  // async function record(canvas: HTMLCanvasElement, time: number) {
  //   if (isRecording.current) return
  //   isRecording.current = true

  //   var recordedChunks: any = []
  //   const recording = await new Promise<string>(function (res, rej) {
  //     var stream = canvas.captureStream(60)
  //     const mediaRecorder = new MediaRecorder(stream, {
  //       mimeType: 'video/webm'
  //     })

  //     //ondataavailable will fire in interval of `time`
  //     mediaRecorder.start(time)

  //     mediaRecorder.ondataavailable = function (event) {
  //       recordedChunks.push(event.data)
  //       // after stop `dataavilable` event run one more time
  //       if (mediaRecorder.state === 'recording') {
  //         mediaRecorder.stop()
  //       }
  //     }

  //     mediaRecorder.onstop = function (event) {
  //       var blob = new Blob(recordedChunks, { type: 'video/webm' })
  //       var url = URL.createObjectURL(blob)
  //       res(url)
  //     }
  //   })
  //   const linkElement = document.createElement('a')
  //   linkElement.href = recording
  //   linkElement.download = 'video'
  //   linkElement.click()
  // }

  const chunks = useRef<Uint8Array[]>([])
  const { meshes, mat, renderer, invalidate, encoder, muxer } = useThree(
    state => {
      chunks.current = []
      initScene(state)

      const geo = create(new InstancedBufferGeometry(), e =>
        assembleBufferGeometry(e)
      )
      const geo2 = create(new InstancedBufferGeometry(), e =>
        assembleBufferGeometry(e)
      )

      const mat = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        uniforms: {
          t: { value: 0 },
          resolution: {
            value: new Vector2(window.innerWidth, window.innerHeight)
          },
          colors: {
            value: [
              new Color().setHSL(0.7, 0.9, 0.8),
              new Color().setHSL(0.9, 0.9, 0.8),
              new Color().setHSL(0.6, 0.9, 0.8),
              new Color().setHSL(0.7, 0.9, 0.8)
            ]
          }
        }
      })

      const meshes = [
        create(new Line(geo, mat), e => {
          state.scene.add(e)
        }),
        create(new Line(geo2, mat), e => {
          state.scene.add(e)
        })
      ]

      // meshes[0].position.set0, 0, 0)
      // meshes[1].position.set(0, 0, 0)

      meshes[0].scale.set(-1.5, 1, 1)
      meshes[1].scale.set(1.5, 1, 1)

      // state.setFrameloop('demand')

      // const video = document.createElement('video')
      // const stream = state.gl.domElement.captureStream(0)
      // video.srcObject = stream;

      // const encoder = new VideoEncoder({
      //   output: (chunk, metadata) => {
      //     const chunkData = new Uint8Array(chunk.byteLength)
      //     chunk.copyTo(chunkData)
      //     chunks.current.push(chunkData)
      //   },
      //   error: (e: any) => {
      //     console.log(e.message)
      //   }
      // })
      // encoder.configure({
      //   codec: 'vp8',
      //   width: state.gl.domElement.width,
      //   height: state.gl.domElement.height,
      //   bitrate: 2_000_000, // 2 Mbps
      //   framerate: 30
      // })

      // const stream = state.gl.domElement.captureStream(0)
      // const track = stream.getVideoTracks()[0]
      // // @ts-ignore
      // const trackProcessor = new MediaStreamTrackProcessor(track)
      // const reader = trackProcessor.readable.getReader()

      let muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: state.gl.domElement.width,
          height: state.gl.domElement.height
        },
        fastStart: 'in-memory'
      })

      let encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: e => console.error(e)
      })
      encoder.configure({
        codec: 'avc1.42001f',
        width: state.gl.domElement.width,
        height: state.gl.domElement.height,
        bitrate: 1e6
      })

      return {
        meshes,
        mat,
        renderer: state.gl,
        invalidate: state.invalidate,
        encoder,
        muxer
      }
    }
  )

  const frameCounter = useRef(0)
  const saveVideo = async () => {
    await encoder.flush()
    muxer.finalize()

    let { buffer } = muxer.target
    const blob = new Blob([buffer], { type: 'video/webm; codecs=avc1.42001f' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Video'
    a.click()
  }

  const a = useRef(document.createElement('a'))
  const savedVideo = useRef(false)

  useFrame(state => {
    const t = (state.clock.elapsedTime / 3) % 1

    mat.uniforms.t.value = t
    mat.uniformsNeedUpdate = true

    // frameCounter.current++

    // const frame = new VideoFrame(state.gl.domElement, {
    //   timestamp: frameCounter.current * (1 / 60)
    // })

    // const keyFrame = frameCounter.current % 150 == 0
    // encoder.encode(frame, { keyFrame })
    // frame.close()

    // if (frameCounter.current >= 3 * 60 && !savedVideo.current) {
    //   savedVideo.current = true
    //   saveVideo()
    //   return
    // }

    // meshes[0].scale.set(-1.5, easing * 1.5, 1)
    // meshes[1].scale.set(1.5, easing * 1.5, 1)

    // mat.uniforms.colors.value = [
    //   new Color().setHSL((0.7 + t) % 1.0, 0.9, 0.8),
    //   new Color().setHSL((0.9 + t) % 1.0, 0.9, 0.8),
    //   new Color().setHSL((0.6 + t) % 1.0, 0.9, 0.8),
    //   new Color().setHSL((0.7 + t) % 1.0, 0.9, 0.8)
    // ]
  })

  // useInterval(() => invalidate(), 150)

  return <></>
}
