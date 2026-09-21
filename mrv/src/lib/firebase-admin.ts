import * as admin from "firebase-admin"
import path from "path"
import fs from "fs"

let firestoreInstance: admin.firestore.Firestore | null = null

export function getAdminFirestore(): admin.firestore.Firestore {
  if (firestoreInstance) return firestoreInstance

  if (!admin.apps.length) {
    const keyCandidates = [
      path.resolve(process.cwd(), "mangroove-startup-96309-firebase-adminsdk-fbsvc-44d45acec2_projectmail.json"),
      path.resolve(process.cwd(), "..", "mrv-backend", "mangroove-startup-96309-firebase-adminsdk-fbsvc-12afac2c68.json"),
    ]
    const keyPath = keyCandidates.find(p => fs.existsSync(p))
    if (keyPath) {
      const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"))
      admin.initializeApp({
        credential: admin.credential.cert(sa),
      })
    } else {
      admin.initializeApp()
    }
  }
  firestoreInstance = admin.firestore()
  return firestoreInstance
}
