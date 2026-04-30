import admin from 'firebase-admin';

const SECRET_KEY = 'levelup-arcade-security-token-2026';

function encryptField(text) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return 'enc:' + Buffer.from(result, 'binary').toString('base64');
}

// Initialize with the current project ID
admin.initializeApp({
  projectId: 'studio-1273073612-71183'
});

const db = admin.firestore();

async function runTest() {
  const schoolId = 'schoolabc';
  const studentId = 'test-student-ai-' + Date.now();
  const email = 'sdeichemed@gmail.com';
  const encryptedEmail = encryptField(email);

  console.log('Creating student:', studentId);
  await db.collection('schools').doc(schoolId).collection('students').doc(studentId).set({
    firstName: 'AI',
    lastName: 'Tester',
    parentEmail: encryptedEmail,
    points: 100
  });

  console.log('Triggering activity...');
  await db.collection('schools').doc(schoolId).collection('students').doc(studentId).collection('activities').add({
    amount: 25,
    desc: 'Test Points from AI Assistant',
    date: Date.now()
  });

  console.log('Test triggered successfully! Wait 20 seconds and then check the "mail" collection.');
  
  // Wait a bit to see if we can find the result in 'mail'
  setTimeout(async () => {
    console.log('Checking for mail document...');
    const mailSnap = await db.collection('mail').where('to', '==', email).get();
    if (mailSnap.empty) {
       console.log('No mail document found yet. The Cloud Function might still be running or the extension is slow.');
    } else {
       console.log('SUCCESS! Mail document found:', mailSnap.docs[0].id);
       console.log('Data:', mailSnap.docs[0].data());
    }
    process.exit(0);
  }, 20000);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
