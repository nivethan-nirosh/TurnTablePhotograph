import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  PermissionsAndroid,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import BleManager from 'react-native-ble-manager';
import { TextEncoder } from 'text-encoding';

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [selectedValue, setSelectedValue] = useState('10');
  const [connected, setConnected] = useState(false);
  const [deviceID, setDeviceID] = useState('');

  const checkAndRequestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const fineLocationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        const coarseLocationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );

        const bluetoothScanGranted =
          Platform.Version >= 31
            ? await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            )
            : true;
        const bluetoothConnectGranted =
          Platform.Version >= 31
            ? await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            )
            : true;

        if (
          !fineLocationGranted ||
          !coarseLocationGranted ||
          !bluetoothScanGranted ||
          !bluetoothConnectGranted
        ) {
          const permissions = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ];

          if (Platform.Version >= 31) {
            console.log('version >31');
            permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
            permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
          }

          const granted = await PermissionsAndroid.requestMultiple(permissions);

          return (
            granted['android.permission.ACCESS_FINE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.ACCESS_COARSE_LOCATION'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
            (Platform.Version < 31 ||
              (granted['android.permission.BLUETOOTH_SCAN'] ===
                PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.BLUETOOTH_CONNECT'] ===
                PermissionsAndroid.RESULTS.GRANTED))
          );
        }
        return true;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const checkBluetoothState = () => {
    BleManager.checkState();
    BleManagerEmitter.addListener('BleManagerDidUpdateState', args => {
      if (args.state === 'on') {
        console.log('Bluetooth is on');
      } else {
        console.log('Bluetooth is off');
      }
    });
  };

  useEffect(() => {
    BleManager.start({ showAlert: false })
      .then(() => {
        console.log('BleManager initialized');
      })
      .catch(error => {
        console.error('BleManager initialization failed', error);
      });
    checkAndRequestPermissions().then(granted => {
      checkBluetoothState();
      console.log('granted', granted);
      if (granted) {
        console.log('Permissions granted');
      } else {
        console.log('Permissions denied');
      }
    });
  }, []);

  const connectToArduino = async () => {
    console.log('connectToArduino');
    try {
      await BleManager.scan([], 5, true);
      console.log('Scanning...');
      setTimeout(async () => {
        try {
          const devices = await BleManager.getDiscoveredPeripherals();
          console.log('Devices discovered:', devices);
          console.log('devices data1', devices[0].advertising);
          console.log('devices data2', devices[1].advertising);
          console.log('devices data3', devices[2].advertising);

          const arduino = devices.find(device => device.name === 'HC-05');
          const phone = devices.find(
            device => device.name === "Thushitha's S23+",
          );

          if (arduino) {
            await BleManager.connect(arduino.id);
            setConnected(true);
            setDeviceID(arduino.id);
            console.log('Connected to Arduino');
          } else {
            console.log('Arduino not found');
          }
        } catch (error) {
          console.error('Error discovering peripherals:', error);
        }
      }, 5000); // Wait for 5 seconds to allow the scan to complete
    } catch (error) {
      console.error('Error during scanning:', error);
    }
  };

  const sendMessage = async (message) => {
    console.log('message', message);
    
    // Connect to your HC-05 device
    const deviceID = '<your-device-id>'; // Replace with your HC-05 device ID
    connectToArduino(); // Assuming this function manages the connection state
    
    if (connected) {
      // Encode the message
      const data = new TextEncoder().encode(message);
  
      // Replace these with the actual UUIDs for your HC-05 module
      const serviceUUID = '00001101-0000-1000-8000-00805F9B34FB'; // Bluetooth Serial Port UUID
      const characteristicUUID = ''; // Classic Bluetooth doesn't typically use characteristic UUIDs
      
      try {
        // Assuming you're using a Bluetooth library like BleManager
        await BleManager.write(
          deviceID,
          serviceUUID,
          characteristicUUID,
          data,
        );
        console.log('Message sent');
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.error('Not connected to HC-05');
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.previewContainer}>
        <Text style={styles.previewText}>Preview</Text>
      </View>

      <View style={styles.controlPanelContainer}>
        <Text style={styles.controlPanelText}>Control Panel</Text>

        <Text style={styles.label}>Light selection</Text>
        <View style={styles.lightSelectionContainer}>
          <TouchableOpacity style={styles.lightButtonRed}>
            <Text style={styles.buttonText}>Red</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lightButtonGreen}>
            <Text style={styles.buttonText}>Green</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.lightButtonBlue}>
            <Text style={styles.buttonText}>Blue</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Select Number of degrees</Text>
        <View style={styles.degreesContainer}>
          <Picker
            selectedValue={selectedValue}
            style={styles.picker}
            onValueChange={itemValue => setSelectedValue(itemValue)}>
            <Picker.Item label="10" value="10" />
            <Picker.Item label="15" value="30" />
            <Picker.Item label="20" value="60" />
            <Picker.Item label="30" value="180" />
            <Picker.Item label="40" value="180" />
            <Picker.Item label="45" value="180" />
            <Picker.Item label="60" value="180" />
            <Picker.Item label="90" value="180" />
            <Picker.Item label="180" value="180" />
          </Picker>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => sendMessage('Hello Arduino')}>
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.exitButton}>
        <Text style={styles.buttonText}>Exit</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  previewContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  controlPanelContainer: {
    width: '100%',
    backgroundColor: '#9e9e9e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  controlPanelText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  lightSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  lightButtonRed: {
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 5,
  },
  lightButtonGreen: {
    backgroundColor: '#388e3c',
    padding: 10,
    borderRadius: 5,
  },
  lightButtonBlue: {
    backgroundColor: '#1976d2',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  degreesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  picker: {
    flex: 1,
    height: 50,
    width: 150,
    marginRight: 10,
  },
  startButton: {
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#d32f2f',
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  exitButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
});

export default App;