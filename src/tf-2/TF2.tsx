import _, { initial } from 'lodash'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import * as twgl from 'twgl.js'
import fragmentShader from './f.frag'
import vertexShader from './v.vert'
import { el } from '@elemaudio/core'
import WebRenderer from '@elemaudio/web-renderer'
import p5 from 'p5'
import { probLog, useEventListener, measureCurvature } from '../util/util'
import * as math from 'mathjs'
import { useNormalize } from '../util/animation'

const c = {
  POINTS: 100,
  DENSITY: 5
}

export default function TF2() {
  const frame = useRef<HTMLCanvasElement>(null!)
  const [{ gl, ctx }, setContexts] = useState<
    | {
        gl: WebGL2RenderingContext
        ctx: AudioContext
      }
    | { gl: null; ctx: null }
  >({ gl: null, ctx: null })

  return (
    <>
      {!gl && (
        <div className='fixed z-100 h-screen w-screen top-0 left-0 bg-black text-white flex items-center justify-center'>
          <button
            onClick={() => {
              setContexts({
                gl: frame.current.getContext('webgl2')!,
                ctx: new AudioContext()
              })
            }}>
            start
          </button>
        </div>
      )}
      <canvas ref={frame} className='h-screen w-screen' />
      {gl && ctx && <SceneMemo gl={gl} ctx={ctx} />}
    </>
  )
}
type propsType = {
  setNdx: number
  tfBufferInfo1: twgl.BufferInfo
  tfBufferInfo2: twgl.BufferInfo
  core: WebRenderer
  tex: WebGLTexture
  array: Uint8Array
  sets: {
    feedback: WebGLTransformFeedback
    tfVAInfo: twgl.VertexArrayInfo
  }[]
  feedbackProgramInfo: twgl.ProgramInfo
  soundReading: {
    speeds: Float32Array
    previousSpeeds: Float32Array
    headings: Float32Array
  }
}
const SceneMemo = memo(Scene, () => true)
function Scene({ gl, ctx }: { gl: WebGL2RenderingContext; ctx: AudioContext }) {
  const [animating, setAnimating] = useState(false)
  const props = useRef<propsType>({} as any)

  const core = useMemo(() => {
    const core = new WebRenderer()
    core.initialize(ctx, {}).then(node => node.connect(ctx.destination))

    core.on('load', () => setAnimating(true))
    // core.on('load', () => {
    //   // core.render(
    //   //   el.mul(el.cycle(909), el.mul(el.cycle(30), el.cycle(1 / 20))),
    //   //   el.mul(
    //   //     el.cycle(30),
    //   //     el.mul(
    //   //       el.cycle(430),
    //   //       el.mul(el.noise(), el.add(el.mul(el.square(el.cycle(1)), 0.3), 0.8))
    //   //     )
    //   //   )
    //   // )
    // })
    return core
  }, [])

  useEffect(() => {
    if (animating) return

    twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    const numParticles = gl.canvas.width * gl.canvas.height
    const positions: number[] = []
    const velocities: number[] = []
    const colors: number[] = []
    const speeds: number[] = []
    for (let i = 0; i < numParticles; ++i) {
      positions.push(_.random(-1, 1, true), _.random(-1, 1, true))
      velocities.push(_.random(-0.1, 0.1), _.random(-0.1, 0.1))
      colors.push(
        // ...(Math.random() < 0.01 ? [1.0, 0.0, 0.0, 1.0] : [1.0, 1.0, 1.0, 0.3])
        1.0,
        1.0,
        1.0,
        0.5
      )
      speeds.push(1.0)
    }

    const tfBufferInfo1 = twgl.createBufferInfoFromArrays(gl, {
      a_positionIn: { numComponents: 2, data: new Float32Array(positions) },
      a_positionOut: { numComponents: 2, data: new Float32Array(positions) },
      a_velocity: { numComponents: 2, data: new Float32Array(velocities) },
      a_color: { numComponents: 4, data: new Float32Array(colors) },
      a_speedIn: { numComponents: 1, data: new Float32Array(speeds) },
      a_speedOut: { numComponents: 1, data: new Float32Array(speeds) }
    })

    const tfBufferInfo2 = twgl.createBufferInfoFromArrays(gl, {
      a_positionIn: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_positionOut.buffer
      },
      a_positionOut: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_positionIn.buffer
      },
      a_velocity: {
        numComponents: 2,
        buffer: tfBufferInfo1.attribs!.a_velocity.buffer
      },
      a_color: {
        numComponents: 4,
        buffer: tfBufferInfo1.attribs!.a_color.buffer
      },
      a_speedIn: {
        numComponents: 1,
        buffer: tfBufferInfo1.attribs!.a_speedOut.buffer
      },
      a_speedOut: {
        numComponents: 1,
        buffer: tfBufferInfo1.attribs!.a_speedIn.buffer
      }
    })

    let setNdx = 0

    const soundReading = {
      speeds: new Float32Array(speeds.length),
      previousSpeeds: new Float32Array(speeds.length),
      headings: new Float32Array(velocities.length)
    }

    props.current = {
      ...props.current,
      setNdx,
      tfBufferInfo1,
      tfBufferInfo2,
      core,
      soundReading
    }
  }, [])

  useEffect(() => {
    if (!animating) return
    let array = new Uint8Array(gl.canvas.width * gl.canvas.height * 4)

    const tex = twgl.createTexture(gl, {
      src: array,
      width: gl.canvas.width,
      height: gl.canvas.height,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE
    })

    props.current = { ...props.current, tex, array }
  }, [animating, gl.canvas.width, gl.canvas.height])

  useEffect(() => {
    if (!animating) return
    const { tfBufferInfo1, tfBufferInfo2 } = props.current

    console.log('recreating transform feedback shaders')
    const feedbackProgramInfo = twgl.createProgramInfo(
      gl,
      [vertexShader, fragmentShader],
      {
        transformFeedbackVaryings: ['a_positionOut', 'a_speedOut']
      }
    )

    const tfVAInfo1 = twgl.createVertexArrayInfo(
      gl,
      feedbackProgramInfo,
      tfBufferInfo1
    )
    const tfVAInfo2 = twgl.createVertexArrayInfo(
      gl,
      feedbackProgramInfo,
      tfBufferInfo2
    )

    const feedback1 = twgl.createTransformFeedback(
      gl,
      feedbackProgramInfo,
      tfBufferInfo1
    )
    const feedback2 = twgl.createTransformFeedback(
      gl,
      feedbackProgramInfo,
      tfBufferInfo2
    )

    const sets = [
      {
        feedback: feedback1,
        tfVAInfo: tfVAInfo1
      },
      {
        feedback: feedback2,
        tfVAInfo: tfVAInfo2
      }
    ]

    props.current = { ...props.current, sets, feedbackProgramInfo }
  }, [animating, gl, ctx, vertexShader, fragmentShader])

  const normChange = useNormalize(0, { signed: true, cancelAbove: 0.7 })

  useEffect(() => {
    console.log('reconstructing animation')

    const sound = () => {
      const {
        tfBufferInfo1,
        tfBufferInfo2,
        setNdx,
        soundReading: { speeds, previousSpeeds, headings },
        core
      } = props.current
      gl.bindBuffer(
        gl.TRANSFORM_FEEDBACK_BUFFER,
        tfBufferInfo1.attribs!.a_speedOut.buffer
      )
      previousSpeeds.set(speeds)
      gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, speeds)
      const speedChange = speeds.map((x, i) => previousSpeeds[i] - x)
      const change = (_.sum(speedChange) / speeds.length) * 1000

      probLog(0.1, change)
      const channel = el.mul(
        el.lowpass(
          el.smooth(
            el.tau2pole(0.2),
            el.const({
              key: 'freq',
              value: 500 + (change < 0 ? change * 300 : change * 200)
            })
          ),
          3,
          el.noise()
        ),
        0.7
      )
      core.render(channel, channel)
    }

    const animate = ({ time, timeDelta }) => {
      if (!animating || !gl) return
      const { tex, setNdx, array, sets, feedbackProgramInfo, tfBufferInfo1 } =
        props.current
      sound()
      // gl.clear()
      // return props
      twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      const { feedback, tfVAInfo } = sets[setNdx]
      props.current.setNdx = 1 - setNdx

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      // update
      gl.bindBuffer(gl.ARRAY_BUFFER, null)

      gl.useProgram(feedbackProgramInfo.program)
      twgl.setBuffersAndAttributes(gl, feedbackProgramInfo, tfVAInfo)
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback)
      gl.beginTransformFeedback(gl.POINTS)
      twgl.setUniforms(feedbackProgramInfo, {
        u_deltaTime: timeDelta,
        u_time: time,
        u_sampler: tex
      })
      twgl.drawBufferInfo(gl, tfVAInfo, gl.POINTS)
      gl.endTransformFeedback()
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)

      gl.readPixels(
        0,
        0,
        gl.canvas.width,
        gl.canvas.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        array
      )
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.canvas.width,
        gl.canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        array
      )
    }

    const frame: FrameRequestCallback = timeDelta => {
      time = time + timeDelta
      animate({ time, timeDelta })
      animationFrame = requestAnimationFrame(frame)
    }

    let time = 0
    let animationFrame = requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  }, [animating])

  useEventListener('resize', () => {
    // twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
  })

  return <></>
}
