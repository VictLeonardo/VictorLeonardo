/**
 * Repositório MOCK de câmeras (status de infraestrutura).
 * Trocar por ../api/cameraRepository.js quando a integração via API/IP
 * (ex.: Intelbras / SDK / ONVIF) estiver disponível.
 */

const { cameras: seed } = require('../../data/seedCameras');

let cameras = JSON.parse(JSON.stringify(seed));

module.exports = {
  async list() {
    return JSON.parse(JSON.stringify(cameras));
  },
  async getById(id) {
    const c = cameras.find((x) => x.id === id);
    return c ? JSON.parse(JSON.stringify(c)) : null;
  },
};
