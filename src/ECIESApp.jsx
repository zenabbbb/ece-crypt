import React, { useState, useEffect } from 'react';
import AppHeader from './components/AppHeader';
import UsageHelp from './components/UsageHelp';
import CurveConfigPanel from './components/CurveConfigPanel';
import TabsNav from './components/TabsNav';
import KeysTab from './components/KeysTab';
import EncryptTab from './components/EncryptTab';
import DecryptTab from './components/DecryptTab';
import GraphVisualizationTab from './components/GraphVisualizationTab';
import ErrorAlert from './components/ErrorAlert';
import AuthTab from './components/AuthTab';
import { auth } from './firebase/firebase/firebaseConfig';
import { fetchUserProfile } from './firebase/firebase/userProfile';
import { uploadPublicKey, fetchPublicKey } from './firebase/firebase/publicKeys';
import { onAuthStateChanged } from 'firebase/auth';

// Elliptic Curve operations using custom curves
class EllipticCurve {
  constructor(a, b, p, Gx, Gy, n) {
    this.a = BigInt(a);
    this.b = BigInt(b);
    this.p = BigInt(p);
    this.G = { x: BigInt(Gx), y: BigInt(Gy) };
    this.n = BigInt(n);

    // Validate curve equation: y^2 = x^3 + ax + b (mod p)
    if (!this.isOnCurve(this.G)) {
      throw new Error('Generator point is not on the curve');
    }
  }

  mod(n, p) {
    n = n % p;
    return n >= 0n ? n : n + p;
  }

  modInv(a, p) {
    let t = 0n, newT = 1n;
    let r = p, newR = this.mod(a, p);

    while (newR !== 0n) {
      const quotient = r / newR;
      [t, newT] = [newT, t - quotient * newT];
      [r, newR] = [newR, r - quotient * newR];
    }

    if (r > 1n) throw new Error('a is not invertible');
    if (t < 0n) t = t + p;

    return t;
  }

  isOnCurve(P) {
    if (!P) return true; // Point at infinity

    const { x, y } = P;
    const left = this.mod(y * y, this.p);
    const right = this.mod(x * x * x + this.a * x + this.b, this.p);

    return left === right;
  }

  pointAdd(P, Q) {
    if (!P) return Q;
    if (!Q) return P;

    if (P.x === Q.x && P.y === this.mod(-Q.y, this.p)) {
      return null; // Point at infinity
    }

    let m;
    if (P.x === Q.x && P.y === Q.y) {
      // Point doubling
      const numerator = this.mod(3n * P.x * P.x + this.a, this.p);
      const denominator = this.mod(2n * P.y, this.p);
      m = this.mod(numerator * this.modInv(denominator, this.p), this.p);
    } else {
      // Point addition
      const numerator = this.mod(Q.y - P.y, this.p);
      const denominator = this.mod(Q.x - P.x, this.p);
      m = this.mod(numerator * this.modInv(denominator, this.p), this.p);
    }

    const x3 = this.mod(m * m - P.x - Q.x, this.p);
    const y3 = this.mod(m * (P.x - x3) - P.y, this.p);

    return { x: x3, y: y3 };
  }

  pointDouble(P) {
    if (!P) return null;

    const numerator = this.mod(3n * P.x * P.x + this.a, this.p);
    const denominator = this.mod(2n * P.y, this.p);
    const m = this.mod(numerator * this.modInv(denominator, this.p), this.p);

    const x3 = this.mod(m * m - 2n * P.x, this.p);
    const y3 = this.mod(m * (P.x - x3) - P.y, this.p);

    return { x: x3, y: y3 };
  }

  scalarMult(k, P) {
    let result = null;
    let addend = P;

    k = BigInt(k);

    while (k > 0n) {
      if (k & 1n) {
        result = this.pointAdd(result, addend);
      }
      addend = this.pointDouble(addend);
      k >>= 1n;
    }

    return result;
  }

  generateKeypair() {
    // In a real implementation, this should use a CSPRNG and proper range
    const privateKey = this.randomScalar();
    const publicKey = this.scalarMult(privateKey, this.G);

    return {
      privateKey: privateKey.toString(),
      publicKey: {
        x: publicKey.x.toString(),
        y: publicKey.y.toString()
      }
    };
  }

  randomScalar() {
    // Simple random scalar generator (not cryptographically secure)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let scalar = 0n;
    for (let i = 0; i < array.length; i++) {
      scalar = (scalar << 8n) | BigInt(array[i]);
    }
    return this.mod(scalar, this.n - 1n) + 1n;
  }

  deriveSharedSecret(privateKey, publicKey) {
    const shared = this.scalarMult(BigInt(privateKey), {
      x: BigInt(publicKey.x),
      y: BigInt(publicKey.y)
    });
    return shared.x.toString();
  }
}

// Standard curves
const STANDARD_CURVES = {
  secp256k1: {
    name: 'secp256k1 (Bitcoin)',
    a: '0',
    b: '7',
    p: '115792089237316195423570985008687907853269984665640564039457584007908834671663',
    Gx: '55066263022277343669578718895168534326250603453777594175500187360389116729240',
    Gy: '32670510020758816978083085130507043184471273380659243275938904335757337482424',
    n: '115792089237316195423570985008687907852837564279074904382605163141518161494337'
  },
  secp256r1: {
    name: 'secp256r1 (P-256)',
    a: '115792089210356248762697446949407573530086143415290314195533631308867097853948',
    b: '41058363725152142129326129780047268409114441015993725554835256314039467401291',
    p: '115792089210356248762697446949407573530086143415290314195533631308867097853951',
    Gx: '48439561293906451759052585252797914202762949526041747995844080717082404635286',
    Gy: '36134250956749795798585127919587881956611106672985015071877198253568414405109',
    n: '115792089210356248762697446949407573529996955224135760342422259061068512044369'
  }
};

// AES-GCM + HKDF helper functions
async function hkdf(sharedSecret, salt, info, length) {
  const ikm = typeof sharedSecret === 'string' ? 
    hexToBytes(sharedSecret) : sharedSecret;

  const key = await crypto.subtle.importKey(
    'raw',
    ikm,
    'HKDF',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt || new Uint8Array(32),
      info: new TextEncoder().encode(info || 'ECIES-AES-256-GCM')
    },
    key,
    length * 8
  );

  return new Uint8Array(bits);
}

function hexToBytes(hex) {
  hex = hex.replace(/^0x/, '');
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}


async function encryptBytes(curve, recipientPublicKey, bytes) {
  // Generate ephemeral keypair
  const ephemeral = curve.generateKeypair();

  // Derive shared secret
  const sharedSecret = curve.deriveSharedSecret(
    ephemeral.privateKey,
    recipientPublicKey
  );

  // Derive encryption key
  const keyMaterial = await hkdf(sharedSecret, null, 'ECIES-AES-256-GCM', 32);
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'AES-GCM',
    false,
    ['encrypt']
  );

  // Encrypt raw bytes (ArrayBuffer or Uint8Array)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    bytes
  );

  return {
    ephemeral_pub: ephemeral.publicKey,
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

async function decryptBytes(curve, privateKey, envelope) {
  // Derive shared secret
  const sharedSecret = curve.deriveSharedSecret(
    privateKey,
    envelope.ephemeral_pub
  );

  // Derive decryption key
  const keyMaterial = await hkdf(sharedSecret, null, 'ECIES-AES-256-GCM', 32);
  const aesKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'AES-GCM',
    false,
    ['decrypt']
  );

  // Decrypt to raw bytes
  const iv = base64ToArrayBuffer(envelope.iv);
  const ciphertext = base64ToArrayBuffer(envelope.ciphertext);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );

  return plaintext;
}

async function encryptMessage(curve, recipientPublicKey, message) {
  const plaintext = new TextEncoder().encode(message);
  return encryptBytes(curve, recipientPublicKey, plaintext);
}

async function decryptMessage(curve, privateKey, envelope) {
  const plaintext = await decryptBytes(curve, privateKey, envelope);
  return new TextDecoder().decode(plaintext);
}

export default function ECIESApp() {
  const [activeTab, setActiveTab] = useState('curve');
  const [showCurveConfig, setShowCurveConfig] = useState(false);

  // Curve parameters
  const [curveParams, setCurveParams] = useState(STANDARD_CURVES['secp256k1']);
  const [customCurve, setCustomCurve] = useState(null);
  const [curveError, setCurveError] = useState('');

  // Keys
  const [publicKeyX, setPublicKeyX] = useState('');
  const [publicKeyY, setPublicKeyY] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  // Auth / user profile
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [showLandingAuth, setShowLandingAuth] = useState(true);

  // Recipient lookup
  const [recipientUsername, setRecipientUsername] = useState('');


  const [recipientPubX, setRecipientPubX] = useState('');
  const [recipientPubY, setRecipientPubY] = useState('');

  // Messages
  const [message, setMessage] = useState('');
  const [encryptedEnvelope, setEncryptedEnvelope] = useState('');
  const [envelopeObj, setEnvelopeObj] = useState(null);
  const [decryptedMessage, setDecryptedMessage] = useState('');

  // File encryption/decryption
  const [fileDownloadUrl, setFileDownloadUrl] = useState('');
  const [fileDownloadName, setFileDownloadName] = useState('');
  const [fileDecryptUrl, setFileDecryptUrl] = useState('');
  const [fileDecryptName, setFileDecryptName] = useState('');
  const [showGuide, setShowGuide] = useState(false);


  // Local curve usage history
  const [curveHistory, setCurveHistory] = useState([]);

  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setGuestMode(false);
        setShowLandingAuth(false);
        fetchUserProfile(firebaseUser.uid)
          .then((profile) => {
            if (profile && profile.username) {
              setUsername(profile.username);
            }
          })
          .catch(() => {
            // Ignore profile load errors; core crypto flows still work.
          });
      } else {
        setUser(null);
        setUsername('');
        if (!guestMode) {
          setShowLandingAuth(true);
        }
      }
    });

    return () => unsubscribe();
  }, [guestMode]);

  // Load curve history from localStorage on first mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('eccCurveHistory');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCurveHistory(parsed);
        }
      }
    } catch (e) {
      // Ignore history loading errors
    }
  }, []);

  // Persist curve history locally whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem('eccCurveHistory', JSON.stringify(curveHistory));
    } catch (e) {
      // Ignore persistence errors
    }
  }, [curveHistory]);

  // Allow user to paste their own private key and derive the corresponding public key
  const updatePublicFromPrivate = (pkString) => {
    setPrivateKey(pkString);
    if (!pkString || !pkString.trim()) {
      setPublicKeyX('');
      setPublicKeyY('');
      return;
    }

    try {
      let curve = customCurve;
      if (!curve) {
        curve = new EllipticCurve(
          curveParams.a,
          curveParams.b,
          curveParams.p,
          curveParams.Gx,
          curveParams.Gy,
          curveParams.n
        );
        setCustomCurve(curve);
      }

      const k = BigInt(pkString);
      if (k <= 0n || k >= curve.n) {
        throw new Error('Private key must be in the range 1..n-1');
      }

      const pub = curve.scalarMult(k, curve.G);
      setPublicKeyX(pub.x.toString());
      setPublicKeyY(pub.y.toString());
    } catch (err) {
      setError('Failed to derive public key from private key: ' + err.message);
    }
  };


  const loadStandardCurve = (curveName) => {
    const preset = STANDARD_CURVES[curveName];
    setCurveParams(preset);
    setCurveError('');
    setCustomCurve(null);
    setCurveHistory((prev) => {
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        label: preset.name || curveName,
        source: 'standard',
        params: preset,
      };
      return [entry, ...prev].slice(0, 10);
    });
  };

  const generateRandomCurve = () => {
    setCurveError('');
    setError('');
    try {
      const smallPrimes = [5, 7, 11, 13, 17, 19, 23, 29, 31];
      const p = smallPrimes[Math.floor(Math.random() * smallPrimes.length)];

      const mod = (n, m) => ((n % m) + m) % m;

      let chosen = null;

      for (let attempts = 0; attempts < 200 && !chosen; attempts++) {
        const a = Math.floor(Math.random() * p);
        const b = Math.floor(Math.random() * p);

        // Ensure curve is non-singular: 4a^3 + 27b^2 != 0 (mod p)
        const disc = mod(4 * a * a * a + 27 * b * b, p);
        if (disc === 0) continue;

        // Find all points on the curve
        const pts = [];
        for (let x = 0; x < p; x++) {
          const x2 = mod(x * x, p);
          const x3 = mod(x2 * x, p);
          const rhs = mod(x3 + a * x + b, p);
          for (let y = 0; y < p; y++) {
            const lhs = mod(y * y, p);
            if (lhs === rhs) {
              pts.push({ x, y });
            }
          }
        }
        if (pts.length === 0) continue;

        // Pick a random point as generator candidate
        const G = pts[Math.floor(Math.random() * pts.length)];

        // Compute order of G by repeated addition until point at infinity
        const tmpCurve = new EllipticCurve(a, b, p, G.x, G.y, 1);
        const Gbig = { x: BigInt(G.x), y: BigInt(G.y) };
        let Q = { ...Gbig };
        let order = 1n;
        const maxSteps = BigInt(p) * BigInt(p) + 2n;

        while (order <= maxSteps) {
          Q = tmpCurve.pointAdd(Q, Gbig);
          order += 1n;
          if (!Q) break;
        }

        if (!Q && order > 1n) {
          const nVal = Number(order);
          if (!Number.isSafeInteger(nVal) || nVal <= 1) {
            continue;
          }
          chosen = { a, b, p, Gx: G.x, Gy: G.y, n: nVal };
        }
      }

      if (!chosen) {
        throw new Error('Could not find a suitable random test curve. Please try again.');
      }

      const nextParams = {
        a: String(chosen.a),
        b: String(chosen.b),
        p: String(chosen.p),
        Gx: String(chosen.Gx),
        Gy: String(chosen.Gy),
        n: String(chosen.n)
      };

      setCurveParams(nextParams);

      setCurveHistory((prev) => {
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          label: 'Random curve',
          source: 'random',
          params: nextParams,
        };
        return [entry, ...prev].slice(0, 10);
      });

      const curve = new EllipticCurve(
        nextParams.a,
        nextParams.b,
        nextParams.p,
        nextParams.Gx,
        nextParams.Gy,
        nextParams.n
      );
      setCustomCurve(curve);

      // Keep config visible so user can see the random curve
      setShowCurveConfig(true);

      // Reset keys and messages because curve changed
      setPrivateKey('');
      setPublicKeyX('');
      setPublicKeyY('');
      setRecipientPubX('');
      setRecipientPubY('');
      setMessage('');
      setEncryptedEnvelope('');
      setEnvelopeObj(null);
      setDecryptedMessage('');
    } catch (err) {
      setCurveError('Failed to generate random curve: ' + err.message);
    }
  };

  const validateAndLoadCurve = () => {
    setCurveError('');
    try {
      const curve = new EllipticCurve(
        curveParams.a,
        curveParams.b,
        curveParams.p,
        curveParams.Gx,
        curveParams.Gy,
        curveParams.n
      );
      setCustomCurve(curve);
      setCurveHistory((prev) => {
        const params = { ...curveParams };
        const entry = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          label: 'Custom curve',
          source: 'custom',
          params,
        };
        return [entry, ...prev].slice(0, 10);
      });
      setShowCurveConfig(false);
      setError('');
    } catch (err) {
      let msg = 'Invalid curve parameters: ' + err.message;

      try {
        if (String(err.message || '').includes('Generator point is not on the curve')) {
          const pNum = Number(curveParams.p);
          const aNum = Number(curveParams.a);
          const bNum = Number(curveParams.b);

          if (
            Number.isFinite(pNum) &&
            Number.isInteger(pNum) &&
            pNum > 0 &&
            pNum <= 500
          ) {
            const mod = (n, m) => ((n % m) + m) % m;
            const suggestions = [];
            for (let x = 0; x < pNum && suggestions.length < 20; x++) {
              const x2 = mod(x * x, pNum);
              const x3 = mod(x2 * x, pNum);
              const rhs = mod(x3 + aNum * x + bNum, pNum);
              for (let y = 0; y < pNum && suggestions.length < 20; y++) {
                const lhs = mod(y * y, pNum);
                if (lhs === rhs) {
                  suggestions.push(`(${x}, ${y})`);
                }
              }
            }
            if (suggestions.length > 0) {
              msg =
                'Invalid curve parameters: generator point is not on the curve. ' +
                'Choose a generator point on the curve, for example one of: ' +
                suggestions.join(', ');
            }
          }
        }
      } catch (e) {
        // ignore suggestion helper errors
      }

      setCurveError(msg);
    }
  };  const handleReuseCurve = (params) => {
    if (!params) return;
    setCurveError('');
    try {
      const nextParams = {
        a: String(params.a),
        b: String(params.b),
        p: String(params.p),
        Gx: String(params.Gx),
        Gy: String(params.Gy),
        n: String(params.n),
      };

      setCurveParams(nextParams);

      const curve = new EllipticCurve(
        nextParams.a,
        nextParams.b,
        nextParams.p,
        nextParams.Gx,
        nextParams.Gy,
        nextParams.n
      );
      setCustomCurve(curve);
      setShowCurveConfig(true);
      setError('');
    } catch (err) {
      setCurveError('Failed to reuse curve: ' + err.message);
    }
  };



  const handleGenerateKeys = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      let curve = customCurve;
      if (!curve) {
        curve = new EllipticCurve(
          curveParams.a,
          curveParams.b,
          curveParams.p,
          curveParams.Gx,
          curveParams.Gy,
          curveParams.n
        );
        setCustomCurve(curve);
      }

      const keypair = curve.generateKeypair();
      setPrivateKey(keypair.privateKey);
      setPublicKeyX(keypair.publicKey.x);
      setPublicKeyY(keypair.publicKey.y);

      if (username) {
        try {
          await uploadPublicKey(
            username.trim(),
            String(keypair.publicKey.x),
            String(keypair.publicKey.y)
          );
          setStatus(`Generated new keypair and saved public key for "${username.trim()}" to the cloud.`);
        } catch (dbErr) {
          // Non-fatal: keys still generated locally even if upload fails.
          console.error('Failed to upload public key to Firestore', dbErr);
          setStatus('Generated new keypair, but failed to save public key to the cloud.');
        }
      } else {
        setStatus('Generated new keypair locally. Set a username in the Account tab to publish your public key.');
      }
    } catch (err) {
      setError('Failed to generate keys: ' + err.message);
    }
    setLoading(false);
  };

  const handleLoadRecipientKey = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      // Require auth before accessing someone else's stored public key
      if (!user) {
        throw new Error("You must be signed in to look up someone's public key.");
      }

      if (!recipientUsername.trim()) {
        throw new Error('Please enter a recipient username');
      }

      const data = await fetchPublicKey(recipientUsername.trim());
      if (!data) {
        throw new Error('No public key found for that username');
      }

      setRecipientPubX(data.pubX);
      setRecipientPubY(data.pubY);
      setStatus(`Loaded public key for "${recipientUsername.trim()}".`);
    } catch (err) {
      console.error(err);
      setError('Failed to load public key for that username.');
    }
    setLoading(false);
  };

  
  const readFileAsArrayBuffer = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });

const handleEncrypt = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    setEncryptedEnvelope('');
    try {
      if (!recipientPubX.trim() || !recipientPubY.trim()) {
        throw new Error('Please enter recipient public key coordinates');
      }
      if (!message.trim()) {
        throw new Error('Please enter a message to encrypt');
      }

      let curve = customCurve;
      if (!curve) {
        curve = new EllipticCurve(
          curveParams.a,
          curveParams.b,
          curveParams.p,
          curveParams.Gx,
          curveParams.Gy,
          curveParams.n
        );
        setCustomCurve(curve);
      }

      const recipientPub = { x: recipientPubX, y: recipientPubY };
      const envelope = await encryptMessage(curve, recipientPub, message);
      setEnvelopeObj(envelope);

      // Build compact non-JSON string: ephemX|ephemY|iv|ciphertext
      const compact = `${envelope.ephemeral_pub.x}|${envelope.ephemeral_pub.y}|${envelope.iv}|${envelope.ciphertext}`;
      setEncryptedEnvelope(compact);
    } catch (err) {
      setError('Encryption failed: ' + err.message);
    }
    setLoading(false);
  };

  const handleDecrypt = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    setDecryptedMessage('');
    try {
      if (!privateKey.trim()) {
        throw new Error('Please enter your private key');
      }
      if (!encryptedEnvelope.trim() && !envelopeObj) {
        throw new Error('Please enter encrypted envelope or encrypt a message first');
      }

      let curve = customCurve;
      if (!curve) {
        curve = new EllipticCurve(
          curveParams.a,
          curveParams.b,
          curveParams.p,
          curveParams.Gx,
          curveParams.Gy,
          curveParams.n
        );
        setCustomCurve(curve);
      }

      let envelope = envelopeObj;
      if (!envelope) {
        // Expect compact format: ephemX|ephemY|iv|ciphertext
        const parts = encryptedEnvelope.split('|');
        if (parts.length !== 4) {
          throw new Error('Encrypted data must be in format: ephemX|ephemY|iv|ciphertext');
        }
        const [ex, ey, iv, ct] = parts.map((p) => p.trim());
        envelope = {
          ephemeral_pub: { x: ex, y: ey },
          iv,
          ciphertext: ct,
        };
      }

      const plaintext = await decryptMessage(curve, privateKey, envelope);
      setDecryptedMessage(plaintext);
      setStatus('Decryption successful.');
    } catch (err) {
      setError('Decryption failed: ' + err.message);
    }
    setLoading(false);
  };


  const handleEncryptFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setStatus('');
    setFileDownloadUrl('');
    setFileDownloadName('');
    try {
      if (!recipientPubX.trim() || !recipientPubY.trim()) {
        throw new Error('Please enter recipient public key coordinates before encrypting a file');
      }

      let curve = customCurve;
      if (!curve) {
        curve = new EllipticCurve(
          curveParams.a,
          curveParams.b,
          curveParams.p,
          curveParams.Gx,
          curveParams.Gy,
          curveParams.n
        );
        setCustomCurve(curve);
      }

      const recipientPub = { x: recipientPubX, y: recipientPubY };
      const bytes = await readFileAsArrayBuffer(file);
      const envelope = await encryptBytes(curve, recipientPub, bytes);

      const wrapped = {
        version: 'ecies-file-v1',
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        envelope,
      };

      const blob = new Blob([JSON.stringify(wrapped, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      setFileDownloadUrl(url);
      setFileDownloadName(file.name + '.enc.json');
      setStatus('File encrypted. Download the .enc.json file and share it with the recipient.');
    } catch (err) {
      setError('File encryption failed: ' + (err.message || String(err)));
    }
    setLoading(false);
  };

  const handleDecryptFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    setStatus('');
    setFileDecryptUrl('');
    setFileDecryptName('');
    try {
      if (!privateKey.trim()) {
        throw new Error('Please enter your private key before decrypting a file');
      }

      let curve = customCurve;
      if (!curve) {
        curve = new EllipticCurve(
          curveParams.a,
          curveParams.b,
          curveParams.p,
          curveParams.Gx,
          curveParams.Gy,
          curveParams.n
        );
        setCustomCurve(curve);
      }

      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error('Encrypted file is not valid JSON');
      }

      if (!parsed || parsed.version !== 'ecies-file-v1' || !parsed.envelope) {
        throw new Error('Encrypted file has an unexpected format');
      }

      const { filename, mimeType, envelope } = parsed;
      const plaintextBuffer = await decryptBytes(curve, privateKey, envelope);

      const blob = new Blob([plaintextBuffer], {
        type: mimeType || 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      setFileDecryptUrl(url);
      setFileDecryptName(filename || 'decrypted.bin');
      setStatus('File decrypted. Download the recovered original file.');
    } catch (err) {
      setError('File decryption failed: ' + (err.message || String(err)));
    }
    setLoading(false);
  };
  const handleContinueAsGuest = () => {
    setGuestMode(true);
    setShowLandingAuth(false);
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setStatus('Copied to clipboard.');
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="section-shell">
      <div className="max-w-6xl mx-auto">
        <AppHeader onOpenGuide={() => setShowGuide(true)} />
        {showGuide && <UsageHelp />}

        <TabsNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {activeTab === 'curve' && (
          <CurveConfigPanel
            curveParams={curveParams}
            setCurveParams={setCurveParams}
            showCurveConfig={showCurveConfig}
            setShowCurveConfig={setShowCurveConfig}
            customCurve={customCurve}
            loadStandardCurve={loadStandardCurve}
            validateAndLoadCurve={validateAndLoadCurve}
            generateRandomCurve={generateRandomCurve}
            curveError={curveError}
            curveHistory={curveHistory}
            onReuseCurve={handleReuseCurve}
          />
        )}

        {activeTab === 'keys' && (
          <KeysTab
            loading={loading}
            handleGenerateKeys={handleGenerateKeys}
            privateKey={privateKey}
            setPrivateKey={updatePublicFromPrivate}
            publicKeyX={publicKeyX}
            publicKeyY={publicKeyY}
            copyToClipboard={copyToClipboard}
            copied={copied}
          />
        )}

        {activeTab === 'encrypt' && (
          <EncryptTab
            loading={loading}
            recipientPubX={recipientPubX}
            setRecipientPubX={setRecipientPubX}
            recipientPubY={recipientPubY}
            setRecipientPubY={setRecipientPubY}
            message={message}
            setMessage={setMessage}
            encryptedEnvelope={encryptedEnvelope}
            copyToClipboard={copyToClipboard}
            copied={copied}
            handleEncrypt={handleEncrypt}
            recipientUsername={recipientUsername}
            setRecipientUsername={setRecipientUsername}
            handleLoadRecipientKey={handleLoadRecipientKey}
            handleEncryptFile={handleEncryptFile}
            fileDownloadUrl={fileDownloadUrl}
            fileDownloadName={fileDownloadName}
          />
        )}

        {activeTab === 'decrypt' && (
          <DecryptTab
            loading={loading}
            privateKey={privateKey}
            setPrivateKey={setPrivateKey}
            encryptedEnvelope={encryptedEnvelope}
            setEncryptedEnvelope={setEncryptedEnvelope}
            decryptedMessage={decryptedMessage}
            handleDecrypt={handleDecrypt}
            handleDecryptFile={handleDecryptFile}
            fileDecryptUrl={fileDecryptUrl}
            fileDecryptName={fileDecryptName}
          />
        )}

        {activeTab === 'graph' && (
          <GraphVisualizationTab curveParams={curveParams} />
        )}

        {activeTab === 'account' && (
          <AuthTab user={user} username={username} setUsername={setUsername} />
        )}

        {status && (
          <p
            className="field-description"
            style={{ marginTop: '0.82rem', color: '#047857' }}
          >
            {status}
          </p>
        )}

        {error && (
          <ErrorAlert message={error} onClose={() => setError('')} />
        )}
      </div>
    </div>
  );
}