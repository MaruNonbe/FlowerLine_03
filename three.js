function fitModelToScreen(model, camera, renderer, options = {}) {
  // オプション
  const margin = options.margin ?? 0.9; // 1に近いほど画面いっぱい、0.9なら少し余白
  const axis   = options.axis ?? 'height'; // 'height' or 'width'

  // 1. モデルの元のバウンディングボックスをとる
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);         // size.x, size.y, size.z がモデルの寸法(ワールド座標)
  const center = new THREE.Vector3();
  box.getCenter(center);

  // 2. モデルを原点付近に寄せておくと扱いやすい
  model.position.sub(center);  // モデルの中心が(0,0,0)に来るようにずらす

  // 3. カメラからどれくらい離すか
  //    今回は z=0 付近にモデルの中心が来るようにするので、カメラをちょっと離して見る前提にする
  const distance = 2; // カメラからモデルまでの距離（お好みで）
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);

  // 4. 画面に収めるためのスケール計算
  const fov = camera.fov * (Math.PI / 180); // ラジアン
  const rendererHeight = renderer.domElement.clientHeight;
  const rendererWidth  = renderer.domElement.clientWidth;
  // 距離distanceのところで見える実際の高さ・幅
  const visibleHeight = 2 * Math.tan(fov / 2) * distance;
  const visibleWidth  = visibleHeight * (rendererWidth / rendererHeight);

  let scale;
  if (axis === 'height') {
    // モデルの高さを画面の高さに合わせる
    scale = (visibleHeight * margin) / size.y;
  } else {
    // モデルの幅を画面の幅に合わせる
    scale = (visibleWidth * margin) / size.x;
  }

  model.scale.set(scale, scale, scale);
}
