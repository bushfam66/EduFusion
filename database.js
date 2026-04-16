// EduFusion Database Manager
class EduFusionDB {
    constructor() {
        this.dbName = 'EduFusionDB';
        this.version = 1;
        this.db = null;
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users store
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    usersStore.createIndex('email', 'email', { unique: true });
                    usersStore.createIndex('role', 'role', { unique: false });
                }

                // Pending admissions store
                if (!db.objectStoreNames.contains('pendingAdmissions')) {
                    const pendingStore = db.createObjectStore('pendingAdmissions', { keyPath: 'id', autoIncrement: true });
                    pendingStore.createIndex('email', 'email', { unique: true });
                    pendingStore.createIndex('submittedBy', 'submittedBy', { unique: false });
                    pendingStore.createIndex('status', 'status', { unique: false });
                }

                // Assignments store
                if (!db.objectStoreNames.contains('assignments')) {
                    const assignmentsStore = db.createObjectStore('assignments', { keyPath: 'id', autoIncrement: true });
                    assignmentsStore.createIndex('assignedByEmail', 'assignedByEmail', { unique: false });
                    assignmentsStore.createIndex('studentEmail', 'studentEmail', { unique: false });
                }

                // Submissions store
                if (!db.objectStoreNames.contains('submissions')) {
                    const submissionsStore = db.createObjectStore('submissions', { keyPath: 'id', autoIncrement: true });
                    submissionsStore.createIndex('teacherEmail', 'teacherEmail', { unique: false });
                    submissionsStore.createIndex('studentEmail', 'studentEmail', { unique: false });
                }

                // Recommendations store
                if (!db.objectStoreNames.contains('recommendations')) {
                    const recommendationsStore = db.createObjectStore('recommendations', { keyPath: 'id', autoIncrement: true });
                    recommendationsStore.createIndex('fromEmail', 'fromEmail', { unique: false });
                    recommendationsStore.createIndex('toEmail', 'toEmail', { unique: false });
                }

                console.log('Database schema created');
            };
        });
    }

    // Generic method to add data to a store
    async addData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to get all data from a store
    async getAllData(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to get data by index
    async getDataByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to get single item by index
    async getSingleByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to update data
    async updateData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic method to delete data
    async deleteData(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Clear all data from a store
    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // User-specific methods
    async addUser(userData) {
        // Check if email already exists
        const existingUser = await this.getSingleByIndex('users', 'email', userData.email);
        if (existingUser) {
            throw new Error('Email already exists');
        }
        return this.addData('users', userData);
    }

    async getAllUsers() {
        return this.getAllData('users');
    }

    async getUserByEmail(email) {
        return this.getSingleByIndex('users', 'email', email);
    }

    async getUsersByRole(role) {
        return this.getDataByIndex('users', 'role', role);
    }

    async updateUser(userData) {
        return this.updateData('users', userData);
    }

    // Assignment methods
    async addAssignment(assignmentData) {
        return this.addData('assignments', assignmentData);
    }

    async getAllAssignments() {
        return this.getAllData('assignments');
    }

    async getAssignmentsByTeacher(teacherEmail) {
        return this.getDataByIndex('assignments', 'assignedByEmail', teacherEmail);
    }

    async getAssignmentsByStudent(studentEmail) {
        return this.getDataByIndex('assignments', 'studentEmail', studentEmail);
    }

    // Submission methods
    async addSubmission(submissionData) {
        return this.addData('submissions', submissionData);
    }

    async getAllSubmissions() {
        return this.getAllData('submissions');
    }

    async getSubmissionsByTeacher(teacherEmail) {
        return this.getDataByIndex('submissions', 'teacherEmail', teacherEmail);
    }

    async getSubmissionsByStudent(studentEmail) {
        return this.getDataByIndex('submissions', 'studentEmail', studentEmail);
    }

    // Pending admissions methods
    async addPendingAdmission(admissionData) {
        // Check if email already exists in users or pending
        const existingUser = await this.getSingleByIndex('users', 'email', admissionData.email);
        if (existingUser) {
            throw new Error('Email already exists as an active user');
        }
        
        const existingPending = await this.getSingleByIndex('pendingAdmissions', 'email', admissionData.email);
        if (existingPending) {
            throw new Error('Email already exists in pending admissions');
        }
        
        return this.addData('pendingAdmissions', admissionData);
    }

    async getAllPendingAdmissions() {
        return this.getAllData('pendingAdmissions');
    }

    async getPendingAdmissionsByTeacher(teacherEmail) {
        return this.getDataByIndex('pendingAdmissions', 'submittedBy', teacherEmail);
    }

    async getPendingAdmissionsByStatus(status) {
        return this.getDataByIndex('pendingAdmissions', 'status', status);
    }

    async updatePendingAdmission(admissionData) {
        return this.updateData('pendingAdmissions', admissionData);
    }

    async approveAdmission(admissionId) {
        // Get the pending admission
        const pendingAdmission = await this.getDataById('pendingAdmissions', admissionId);
        if (!pendingAdmission) {
            throw new Error('Pending admission not found');
        }

        // Create the user account
        const userData = {
            name: pendingAdmission.name,
            email: pendingAdmission.email,
            password: pendingAdmission.password,
            role: 'student',
            createdAt: new Date().toISOString(),
            profileComplete: false,
            profile: {
                school: pendingAdmission.school,
                age: pendingAdmission.age,
                class: pendingAdmission.class,
                pathway: pendingAdmission.pathway,
                selectedSubjects: pendingAdmission.selectedSubjects
            }
        };

        await this.addUser(userData);

        // Update the pending admission status
        pendingAdmission.status = 'approved';
        pendingAdmission.approvedAt = new Date().toISOString();
        await this.updateData('pendingAdmissions', pendingAdmission);

        return userData;
    }

    async rejectAdmission(admissionId, reason = '') {
        const pendingAdmission = await this.getDataById('pendingAdmissions', admissionId);
        if (!pendingAdmission) {
            throw new Error('Pending admission not found');
        }

        pendingAdmission.status = 'rejected';
        pendingAdmission.rejectedAt = new Date().toISOString();
        pendingAdmission.rejectionReason = reason;
        await this.updateData('pendingAdmissions', pendingAdmission);

        return pendingAdmission;
    }

    // Helper method to get data by ID
    async getDataById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Initialize demo data
    async initializeDemoData() {
        try {
            // Clear existing data
            await this.clearStore('users');
            await this.clearStore('assignments');
            await this.clearStore('submissions');
            await this.clearStore('recommendations');

            // Add demo users
            const demoUsers = [
                {
                    name: 'Demo Student',
                    email: 'demo@edufusion.com',
                    password: 'Demo@123',
                    role: 'student',
                    createdAt: new Date().toISOString(),
                    profileComplete: true,
                    profile: {
                        school: 'Demo High School',
                        age: '16',
                        class: 'Form 3',
                        pathway: 'stem',
                        selectedSubjects: ['Mathematics', 'English', 'Kiswahili', 'Community Service Learning', 'Physical Education', 'Biology', 'Chemistry', 'Physics']
                    }
                },
                {
                    name: 'Demo Teacher',
                    email: 'teacher@edufusion.com',
                    password: 'Teacher@123',
                    role: 'teacher',
                    createdAt: new Date().toISOString(),
                    profileComplete: true,
                    profile: {
                        teaches: ['Mathematics', 'Biology', 'Computer Science']
                    }
                },
                {
                    name: 'Demo Admin',
                    email: 'admin@edufusion.com',
                    password: 'Admin@123',
                    role: 'administrator',
                    createdAt: new Date().toISOString(),
                    profileComplete: true,
                    profile: {
                        school: 'Demo School'
                    }
                }
            ];

            for (const user of demoUsers) {
                await this.addUser(user);
            }

            console.log('Demo data initialized successfully');
        } catch (error) {
            console.error('Error initializing demo data:', error);
        }
    }
}

// Global database instance
const edufusionDB = new EduFusionDB();