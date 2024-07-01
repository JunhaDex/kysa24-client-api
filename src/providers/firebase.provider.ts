import { App, applicationDefault, initializeApp } from 'firebase-admin/app';
import { Storage } from '@google-cloud/storage';
import axios from 'axios';

export async function getFirebase(): Promise<{ app: App; token: string }> {
  const app = initializeApp({
    credential: applicationDefault(),
  });
  const token = await app.options.credential.getAccessToken();
  return { app, token: token.access_token };
}

export function getBucket() {
  const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_NAME,
    keyFilename: process.env.GOOGLE_APPLICATION_SECRET,
  });
  return storage.bucket(process.env.GCP_CLOUD_STORAGE_BUCKET_NAME);
}

function getAxiosInstance(cred: string) {
  const pjName = process.env.FIREBASE_PROJECT_NAME;
  return axios.create({
    baseURL: `https://fcm.googleapis.com/v1/projects/${pjName}/`,
    headers: {
      Authorization: `Bearer ${cred}`,
      'Content-Type': 'application/json',
    },
  });
}

export function sendTargetDevice(fcm: string, cred: string, payload: any) {
  const api = getAxiosInstance(cred);
  return api.post('messages:send', {
    message: {
      token: fcm,
      data: payload,
    },
  });
}

export function sendTargetTopic(topic: string, cred: string, payload: any) {
  const api = getAxiosInstance(cred);
  return api.post('messages:send', {
    message: {
      topic,
      data: payload,
    },
  });
}
