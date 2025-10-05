const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../server'); // Import the Express app
const User = require('../../models/User'); // Import the User model for cleanup

describe('User Authentication Lifecycle', () => {

    // Before each test, we clear the User collection to ensure a clean slate.
    // This allows us to re-register the same user for each test run without conflicts.
    beforeEach(async () => {
        await User.deleteMany({});
    });

    // After all tests are done, close the database connection
    // to allow the Jest process to exit gracefully.
    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should allow a user to sign up, log in, and then log out successfully', async () => {
        // Use a supertest agent to persist cookies between requests, simulating a browser session.
        const agent = request.agent(app);

        const newUser = {
            name: 'Lifecycle User',
            username: 'lifecycle_user',
            email: 'lifecycle@example.com',
            password: 'strongPassword123',
        };

        // --- PHASE 1: SIGN UP ---
        const signupResponse = await agent
            .post('/api/auth/signup')
            .send(newUser);

        // Test the signup response
        expect(signupResponse.statusCode).toBe(201);
        expect(signupResponse.body).toHaveProperty('id');
        expect(signupResponse.body.username).toBe(newUser.username);
        console.log('Phase 1: Signup successful.');


        // --- PHASE 2: LOG IN ---
        const loginResponse = await agent
            .post('/api/auth/login')
            .send({
                emailOrUsername: newUser.email,
                password: newUser.password,
            });

        // Test the login response
        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body).toEqual({ success: true });
        console.log('Phase 2: Login successful.');


        // --- VERIFY LOGIN by accessing a protected route ---
        const protectedResponse = await agent.get('/api/auth/me');
        expect(protectedResponse.statusCode).toBe(200);
        expect(protectedResponse.body.username).toBe(newUser.username);
        console.log('Verified: Access to protected route granted.');


        // --- PHASE 3: LOG OUT ---
        const logoutResponse = await agent.post('/api/auth/logout').send();

        // Test the logout response
        expect(logoutResponse.statusCode).toBe(200); // 200 OK
        expect(logoutResponse.body).toEqual({ success: true });
        console.log('Phase 3: Logout successful.');


        // --- FINAL VERIFICATION: ATTEMPT to access protected route after logout ---
        const finalCheckResponse = await agent.get('/api/auth/me');

        // Test that access is now denied
        expect(finalCheckResponse.statusCode).toBe(401); // 401 Unauthorized
        console.log('Verified: Access to protected route denied after logout.');
    });
});