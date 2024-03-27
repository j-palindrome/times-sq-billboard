import _ from 'lodash'
import p5 from 'p5'
import { useEffect, useRef, useState } from 'react'
import invariant from 'tiny-invariant'
import * as twgl from 'twgl.js'
import fragmentShader from './f.frag'
import vertexShader from './v.vert'
import saveAs from 'file-saver'

export default function TF3() {
  const [started, setStarted] = useState(false)
  const frame = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!started) return
    const p = new p5((p: p5) => {
      let gl: WebGL2RenderingContext
      let ctx: AudioContext
      let tex, setNdx, array, sets, feedbackProgramInfo

      p.setup = () => {
        invariant(frame.current)
        p.createCanvas(
          window.innerWidth,
          window.innerHeight,
          p.WEBGL,
          frame.current
        )
        gl = p.drawingContext
        console.log(gl.canvas.width, gl.canvas.height)

        ctx = new AudioContext()

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
          a_positionOut: {
            numComponents: 2,
            data: new Float32Array(positions)
          },
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

        setNdx = 0

        array = new Uint8Array(gl.canvas.width * gl.canvas.height * 4)

        tex = twgl.createTexture(gl, {
          src: array,
          width: gl.canvas.width,
          height: gl.canvas.height,
          format: gl.RGBA,
          type: gl.UNSIGNED_BYTE
        })

        feedbackProgramInfo = twgl.createProgramInfo(
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

        sets = [
          {
            feedback: feedback1,
            tfVAInfo: tfVAInfo1
          },
          {
            feedback: feedback2,
            tfVAInfo: tfVAInfo2
          }
        ]

        // p.frameRate(20)
        // p.saveFrames('frame', 'png', 5000, 20, images => {
        //   let i = 0
        //   const download = async () => {
        //     if (i >= images.length) return
        //     const { imageData, filename, ext } = images[i]
        //     console.log('saving', images[i])
        //     saveAs(imageData, `${filename}.${ext}`)
        //     i++
        //     setTimeout(download, 200)
        //   }
        //   download()
        // })
      }

      p.draw = () => {
        const time = p.millis() / 1000
        const timeDelta = p.deltaTime / 1000
        // gl.clear()
        // return props
        twgl.resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement)
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        const { feedback, tfVAInfo } = sets[setNdx]
        setNdx = 1 - setNdx

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        // p.clear(0, 0, 0, 1)

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
    })
  }, [started])

  return (
    <>
      {!started && (
        <div className='fixed z-100 h-screen w-screen top-0 left-0 bg-black text-white flex items-center justify-center'>
          <button
            onClick={() => {
              setStarted(true)
            }}>
            start
          </button>
        </div>
      )}{' '}
      : <canvas ref={frame} className='h-screen w-screen'></canvas>
    </>
  )
}
