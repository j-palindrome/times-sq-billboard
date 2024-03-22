import { useMemo } from 'react'
import mqtt from 'mqtt'
import { useInterval } from '../util/util'

export default function Servo() {
  const client = useMemo(() => {
    const client = mqtt.connect('http://hardwaremovement.com:1883')
    client.subscribe('avocado24')

    return client
  }, [])

  function sendNote(msg: { servo: number }) {
    client.publish('avocado24_msg', JSON.stringify(msg))
  }
  // useInterval(() => {
  //   sendNote({ servo: Math.random() })
  // }, 500)
  return <></>
}
