
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8UDVcA5e8HU0rQZkyOEWhQ4wDjWNTSU4",
  authDomain: "levelup-edu.firebaseapp.com",
  projectId: "levelup-edu",
  storageBucket: "levelup-edu.appspot.com",
  messagingSenderId: "1056580556857",
  appId: "1:1056580556857:web:6e6f6f6f6f6f6f6f6f6f6f" // Placeholder from client-provider if needed
};

// Use the local emulator if running, or just try to connect
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRules() {
  const schoolId = 'schoolabc';
  console.log(`Checking attendance reward rules for school: ${schoolId}`);
  
  // Rules are in schools/{schoolId}/teachers/{teacherId}/attendanceRewards
  // We need to find teachers first
  const teachersCol = collection(db, 'schools', schoolId, 'teachers');
  const teachersSnap = await getDocs(teachersCol);
  
  for (const teacherDoc of teachersSnap.docs) {
    const rulesCol = collection(db, 'schools', schoolId, 'teachers', teacherDoc.id, 'attendanceRewards');
    const rulesSnap = await getDocs(rulesCol);
    if (rulesSnap.size > 0) {
      console.log(`Teacher ${teacherDoc.id} has ${rulesSnap.size} rules:`);
      rulesSnap.forEach(doc => {
        console.log(` - Rule ID: ${doc.id}, data: ${JSON.stringify(doc.data())}`);
      });
    }
  }
}

checkRules().catch(console.error);
