import _ from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import * as math from 'mathjs'

export const useEventListener = <K extends keyof WindowEventMap>(
  listener: K,
  func: (data: WindowEventMap[K]) => void,
  dependencies: any[] = []
) => {
  useEffect(() => {
    window.addEventListener(listener, func)
    return () => window.removeEventListener(listener, func)
  }, dependencies)
}

export const useInterval = (
  interval: () => void,
  intervalTime: number,
  dependencies: any[] = []
) => {
  useEffect(() => {
    const intervalIndex = window.setInterval(interval, intervalTime)
    return () => window.clearInterval(intervalIndex)
  }, dependencies)
}

export const rad = (progress: number) => progress * Math.PI * 2

export const scale = <T extends number | number[]>(
  input: T,
  low: number,
  high: number,
  lowOut: number,
  highOut: number,
  exp: number = 1,
  clamp = true
): T => {
  const scaleNumber = (input: number) => {
    if (high === low) return lowOut
    const zTo1 = ((input - low) / (high - low)) ** exp
    let final = zTo1 * (highOut - lowOut) + lowOut
    if (clamp && final > Math.max(lowOut, highOut)) return highOut
    if (clamp && final < Math.min(lowOut, highOut)) return lowOut
    return final
  }
  if (input instanceof Array) {
    return input.map(value => scaleNumber(value)) as T
  } else {
    return scaleNumber(input) as T
  }
}

export const create = <T>(e: T, onCreate: (argument: T) => void) => {
  onCreate(e)
  return e
}

export const useMemoCleanup = <T>(
  create: () => T,
  cleanup: (item: T) => void,
  deps: any[] = []
) => {
  const itemRef = useRef<T | null>(null)
  const item = useMemo(() => {
    if (itemRef.current) {
      cleanup(itemRef.current)
      itemRef.current = null
    }
    return create()
  }, deps)
  itemRef.current = item
  return item
}

export const measureCurvature = (
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  t: number
) => {
  const func = v0
    .multiplyScalar(1 - t)
    .add(v1.multiplyScalar(t))
    .multiplyScalar(1 - t)
    .add(
      v1
        .multiplyScalar(1 - t)
        .add(v2.multiplyScalar(t))
        .multiplyScalar(t)
    )

  // from https://math.stackexchange.com/questions/220900/bezier-curvature

  // const firstDerivative = v1
  //   .sub(v0)
  //   .multiplyScalar(2 * (1 - t))
  //   .add(v2.sub(v1).multiplyScalar(2 * t))

  // const secondDerivative = v2
  //   .sub(v1.multiplyScalar(2).add(v0))
  //   .multiplyScalar(2)

  return (
    (math.det(
      math.matrix([v1.sub(v0).toArray(), v2.sub(v1).toArray(), [0, 0, 1]])
    ) *
      4) /
    (func.length() * 3)
  )
}
