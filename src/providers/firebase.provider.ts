import {
  App,
  applicationDefault,
  initializeApp,
  getApps,
} from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';

export async function getFirebase(): Promise<{ app: App; token: string }> {
  let app: App;
  if (getApps().length === 0) {
    app = initializeApp({
      credential: applicationDefault(),
    });
  } else {
    app = getApps()[0];
  }
  const token = await app.options.credential.getAccessToken();
  return { app, token: token.access_token };
}

export function getBucket() {
  const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_NAME,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
  return storage.bucket(process.env.GCP_CLOUD_STORAGE_BUCKET_NAME);
}

function getAxiosInstance(cred: string) {
  const pjName = process.env.FIREBASE_PROJECT_NAME;
  const inst = axios.create({
    baseURL: `https://fcm.googleapis.com/v1/projects/${pjName}/`,
    headers: {
      Authorization: `Bearer ${cred}`,
      'Content-Type': 'application/json',
    },
  });
  inst.interceptors.response.use(
    (res) => res,
    (err) => {
      console.log(err.response);
      console.log(err.response.status);
      return Promise.reject(err);
    },
  );
  return inst;
}

export function sendTargetDevice(fcm: string, cred: string, payload: any) {
  const api = getAxiosInstance(cred);
  return api.post('messages:send', {
    message: {
      token: fcm,
      data: { raw: JSON.stringify(payload) },
    },
  });
}

export async function sendTargetTopic(
  topic: string,
  cred: string,
  payload: any,
) {
  console.log('sendTargetTopic', { topic, cred, payload });
  const api = getAxiosInstance(cred);
  return await api.post('messages:send', {
    message: {
      topic,
      data: { raw: JSON.stringify(payload) },
    },
  });
}
