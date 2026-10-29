import * as THREE from 'three'

export class GarageScene {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  private frameId: number | null = null

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a1a)

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(4, 2.5, 6)
    this.camera.lookAt(0, 0.5, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.buildGarageRoom()
    this.addLights()
  }

  private buildGarageRoom(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x333333 }),
    )
    floor.rotation.x = -Math.PI / 2
    this.scene.add(floor)

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 5),
      new THREE.MeshStandardMaterial({ color: 0x444444 }),
    )
    backWall.position.set(0, 2.5, -6)
    this.scene.add(backWall)
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(5, 8, 5)
    this.scene.add(dirLight)
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  /**
   * Idempotent: safe to call on every garage entry, including when re-using an
   * instance that was previously stopped. The resize listener is bound here (and
   * released in stop()) so a stopped scene does no work at all.
   */
  start(): void {
    if (this.frameId !== null) return
    window.addEventListener('resize', this.onResize)
    const loop = (): void => {
      this.frameId = requestAnimationFrame(loop)
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  stop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
    window.removeEventListener('resize', this.onResize)
  }
}
