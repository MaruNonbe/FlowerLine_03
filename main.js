import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';

// --- グローバル変数 ---
let camera, scene, renderer;
let model = null;
let facePlateMaterial = null;

const moveState = { forward: 0, turn: 0 };
const MOVE_SPEED = 0.5;
const TURN_SPEED = 0.8;
const clock = new THREE.Clock();

init();
setupUI();

async function init() {
    // シーンとカメラ
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // レンダラー
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // ライト
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(1, 2, 0.5);
    scene.add(dir);

    // --- AR ボタンのセットアップ ---
    const arButtonElement = document.getElementById('start-ar-button');
    const welcomeScreen = document.getElementById('welcome-screen');
    const arUI = document.getElementById('ar-ui');
    const textureUI = document.querySelector('.texture-controls');

    // three.js が作る本物のボタンを作って隠す
    const realARButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test']
    });
    realARButton.style.display = 'none';
    document.body.appendChild(realARButton);

    // 自前ボタンから本物をクリックするだけにする
    arButtonElement.onclick = () => {
        realARButton.click();
        welcomeScreen.style.display = 'none';
        arUI.style.display = 'block';
        textureUI.style.display = 'block';
    };

    // モデルをロード（ロードしたらすぐ表示する）
    loadModel();

    // 描画ループ
    renderer.setAnimationLoop(renderLoop);

    // リサイズ
    window.addEventListener('resize', onWindowResize);
}

function loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        'AR-Train_Nagai.glb',        // ← 同じフォルダにある前提
        (gltf) => {
            model = gltf.scene;

            // 大きさと位置を決める（そのままだと大きすぎることが多い）
            model.scale.set(0.05, 0.05, 0.05);
            model.position.set(0, 0, -1.5); // カメラの正面1.5m

            // 顔写真用のメッシュがあれば保持
            const facePlateName = 'Face_Plate';
            model.traverse((child) => {
                if (child.isMesh && child.name.includes(facePlateName)) {
                    facePlateMaterial = child.material.clone();
                    child.material = facePlateMaterial;
                }
            });

            // ★ここが元のコードと一番違うところ
            // すぐに表示するようにする
            scene.add(model);
        },
        undefined,
        (error) => {
            console.error('モデルのロードに失敗しました', error);
        }
    );
}

function setupUI() {
    const stop = () => { moveState.forward = 0; moveState.turn = 0; };

    document.getElementById('btn-forward').addEventListener('pointerdown', () => moveState.forward = 1);
    document.getElementById('btn-backward').addEventListener('pointerdown', () => moveState.forward = -1);
    document.getElementById('btn-left').addEventListener('pointerdown', () => moveState.turn = -1);
    document.getElementById('btn-right').addEventListener('pointerdown', () => moveState.turn = 1);

    document.getElementById('btn-stop').addEventListener('click', stop);
    document.addEventListener('pointerup', stop);

    // 顔写真アップロード
    document.getElementById('texture-upload').addEventListener('change', onTextureSelected);
}

function onTextureSelected(e) {
    if (!facePlateMaterial) {
        alert('顔写真用のメッシュが見つかりませんでした（Face_Plate）。');
        return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const texLoader = new THREE.TextureLoader();
        texLoader.load(
            reader.result,
            (tex) => {
                tex.flipY = false;
                tex.colorSpace = THREE.SRGBColorSpace;
                facePlateMaterial.map = tex;
                facePlateMaterial.needsUpdate = true;
                console.log('テクスチャを更新しました');
            },
            undefined,
            (err) => console.error(err)
        );
    };
    reader.readAsDataURL(file);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderLoop() {
    const delta = clock.getDelta();

    // モデルが出ていれば操作を反映
    if (model) {
        // 前進/後進
        if (moveState.forward !== 0) {
            const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);
            model.position.addScaledVector(dir, moveState.forward * MOVE_SPEED * delta);
        }
        // 左右回転
        if (moveState.turn !== 0) {
            model.rotateY(-moveState.turn * TURN_SPEED * delta);
        }
    }

    renderer.render(scene, camera);
}
