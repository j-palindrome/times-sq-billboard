class FractalNoise extends AudioWorkletProcessor {
  phase: number

  constructor() {
    super()
    this.phase = 0
    // this.audioBuffer = new Float32Array(44100)
    // this.index = 0
    // this.recording = false

    // this.port.onmessage = event => {
    //   if (event.data.type === 'start') {
    //     this.recording = true
    //     this.index = 0
    //   } else if (event.data.type === 'stop') {
    //     this.recording = false
    //     this.index = 0
    //   } else if (event.data.type === 'setLength') {
    //     const newAudioBuffer = new Float32Array(event.data.length)
    //     newAudioBuffer.set(this.audioBuffer.slice(0, newAudioBuffer.length))
    //     this.audioBuffer = newAudioBuffer
    //   }
    // }
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ) {
    this.phase += outputs[0][0].length / 44100
    let t = 20
    const AMOUNT = 10
    // for (let i = 0; i < outputs[0][0].length; i++) {
    //   outputs[0][0][i] = Math.random()
    // }
    for (let i = 0; i < outputs[0][0].length; i++) {
      let sampleValue = 0
      for (let j = 0; j < AMOUNT; j++) {
        const freq = 200 * 2 ** (1 + (j * 100) / AMOUNT)
        sampleValue += Math.sin(Math.PI * 2 * (this.phase + i / 44100) * freq)
      }
      outputs[0][0][i] = sampleValue / AMOUNT
      // outputs[0][0][i] = Math.sin(Math.PI * 2 * (this.phase + i / 44100) * 440)
    }
    // if (this.recording) {
    //   if (this.index < this.audioBuffer.length) {
    //     if (this.audioBuffer.length < this.index + inputs[0][0].length) {
    //       this.audioBuffer.set(
    //         inputs[0][0]
    //           .slice(0, this.audioBuffer.length - this.index)
    //           .map(
    //             (x, i) =>
    //               x *
    //               Math.sin(
    //                 ((i + this.index) / this.audioBuffer.length) * Math.PI
    //               )
    //           ),
    //         this.index
    //       )
    //     } else {
    //       this.audioBuffer.set(
    //         inputs[0][0].map(
    //           (x, i) =>
    //             x *
    //             Math.sin(((i + this.index) / this.audioBuffer.length) * Math.PI)
    //         ),
    //         this.index
    //       )
    //     }
    //     this.index += inputs[0][0].length
    //   } else {
    //     this.port.postMessage({ type: 'buffer', buffer: this.audioBuffer })
    //     // loop the recording
    //     this.index = 0
    //   }
    // }

    return true
  }
}

registerProcessor('FractalNoise', FractalNoise)
