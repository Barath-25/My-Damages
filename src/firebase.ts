import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, Timestamp, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigImport from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigImport.apiKey,
  authDomain: firebaseConfigImport.authDomain,
  projectId: firebaseConfigImport.projectId,
  storageBucket: firebaseConfigImport.storageBucket,
  messagingSenderId: firebaseConfigImport.messagingSenderId,
  appId: firebaseConfigImport.appId,
  measurementId: firebaseConfigImport.measurementId,
};

const firestoreDatabaseId = firebaseConfigImport.firestoreDatabaseId;

// Validate config
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined' || firebaseConfig.apiKey === '') {
  console.error("Firebase API Key is missing. Please check your Firebase configuration.");
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
  throw error;
}

export const db = getFirestore(app, firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    if (error.code === 'auth/operation-not-allowed') {
      alert("Google Sign-In is not enabled in your Firebase project. Please enable it in the Firebase Console.");
    } else if (error.code === 'auth/invalid-api-key') {
      alert("Invalid Firebase API Key. Please check your configuration.");
    } else if (error.code === 'auth/unauthorized-domain') {
      alert("This domain is not authorized for Firebase Authentication. Please add it to the 'Authorized domains' list in your Firebase Console.");
    } else {
      alert(`Login failed: ${error.message}`);
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

// ===============================================================
// Firestore Error Handling
// ===============================================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client appears to be offline.");
    }
  }
}
testConnection();
