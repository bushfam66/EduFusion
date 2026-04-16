// Test script for admission system
// Run this in browser console to test the admission workflow

async function testAdmissionWorkflow() {
    console.log('Testing EduFusion Admission System...');

    try {
        // Test 1: Initialize database
        console.log('1. Testing database initialization...');
        await initDB();
        console.log('✓ Database initialized successfully');

        // Test 2: Add a pending admission
        console.log('2. Testing pending admission creation...');
        const testAdmission = {
            studentName: 'John Doe',
            studentEmail: 'john.doe@example.com',
            studentPhone: '123-456-7890',
            subjects: ['Mathematics', 'Physics'],
            submittedBy: 'teacher@example.com',
            submittedAt: new Date().toISOString(),
            status: 'pending'
        };

        const admissionId = await addPendingAdmission(testAdmission);
        console.log('✓ Pending admission created with ID:', admissionId);

        // Test 3: Get pending admissions
        console.log('3. Testing pending admissions retrieval...');
        const pendingAdmissions = await getPendingAdmissions();
        console.log('✓ Found', pendingAdmissions.length, 'pending admissions');

        // Test 4: Approve admission
        console.log('4. Testing admission approval...');
        const approvedUser = await approveAdmission(admissionId, 'admin@example.com');
        console.log('✓ Admission approved, user created:', approvedUser);

        // Test 5: Verify user was created
        console.log('5. Testing user creation verification...');
        const users = await getAllUsers();
        const newUser = users.find(u => u.email === testAdmission.studentEmail);
        if (newUser) {
            console.log('✓ User created successfully:', newUser.name);
        } else {
            throw new Error('User was not created');
        }

        // Test 6: Test rejection (create another admission first)
        console.log('6. Testing admission rejection...');
        const testAdmission2 = {
            studentName: 'Jane Smith',
            studentEmail: 'jane.smith@example.com',
            studentPhone: '987-654-3210',
            subjects: ['Chemistry', 'Biology'],
            submittedBy: 'teacher@example.com',
            submittedAt: new Date().toISOString(),
            status: 'pending'
        };

        const admissionId2 = await addPendingAdmission(testAdmission2);
        await rejectAdmission(admissionId2, 'admin@example.com');
        console.log('✓ Admission rejected successfully');

        console.log('\n🎉 All admission system tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Auto-run test if this script is loaded
if (typeof window !== 'undefined') {
    // Wait for database.js to load
    setTimeout(testAdmissionWorkflow, 1000);
}