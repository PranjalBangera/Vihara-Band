let device = null;
let stepCharacteristic = null;
let fallCharacteristic = null;
let batteryCharacteristic = null;

async function connectDevice() {
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['12340000-1234-1234-1234-123456789012'] }],
      optionalServices: ['180F']
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('12340000-1234-1234-1234-123456789012');
    const batteryService = await server.getPrimaryService('180F');

    stepCharacteristic = await service.getCharacteristic('12340001-1234-1234-1234-123456789012');
    fallCharacteristic = await service.getCharacteristic('12340002-1234-1234-1234-123456789012');
    batteryCharacteristic = await batteryService.getCharacteristic('0x2A19');

    await stepCharacteristic.startNotifications();
    await fallCharacteristic.startNotifications();
    await batteryCharacteristic.startNotifications();

    stepCharacteristic.addEventListener('characteristicvaluechanged', onStepNotify);
    fallCharacteristic.addEventListener('characteristicvaluechanged', onFallNotify);
    batteryCharacteristic.addEventListener('characteristicvaluechanged', onBatteryNotify);

    console.log('Connected to Vihara Band');
  } catch (err) {
    console.error(err);
  }
}

function onStepNotify(event) {
  const value = event.target.value;
  const steps = value.getUint8(0) | (value.getUint8(1) << 8) | (value.getUint8(2) << 16);
  console.log('Step count:', steps);
}

function onFallNotify(event) {
  const value = event.target.value;
  console.log('Fall event:', value.getUint8(0));
}

function onBatteryNotify(event) {
  const value = event.target.value;
  console.log('Battery:', value.getUint8(0));
}

window.connectDevice = connectDevice;
