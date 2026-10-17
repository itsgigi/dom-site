export type HairlineRead = { textContent: string | null }
export type HairlineFigure = {
  name: string
  means: string
  range: [number, number, number]
  mount: (
    ctx: { stage: HTMLElement; svg: SVGSVGElement; read: HairlineRead },
    value: number,
  ) => { set: (value: number) => void; destroy: () => void }
}
