# Test Credentials for Local Testing

## ✅ Registration Fixed!

The registration issue has been resolved. The backend now uses an in-memory mock authentication system that doesn't require a database.

---

## 🔐 Pre-configured Admin Account

You can now login with the following credentials:

### Admin User
- **Email**: `admin@example.com`
- **Password**: `password`
- **User ID**: `admin123`
- **Role**: Admin

---

## 📝 How to Test

### Option 1: Login with Admin Account
1. Go to http://localhost:5173/login
2. Enter:
   - Email: `admin@example.com`
   - Password: `password`
3. Click "Login"
4. You should be redirected to the dashboard

### Option 2: Register a New User
1. Go to http://localhost:5173/register
2. Fill in the form with your details:
   - Email: `your-email@example.com`
   - Password: `your-password`
   - Name: `Your Name`
   - Age: `25` (optional)
   - Income: `50000` (optional)
   - State: `Karnataka` (optional)
3. Click "Register"
4. You should be redirected to the dashboard

---

## 🧪 Testing the API Directly

### Login Test
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

Expected response:
```json
{
  "user": {
    "userId": "admin123",
    "email": "admin@example.com",
    "name": "Admin User"
  },
  "accessToken": "mock_access_token_admin123",
  "refreshToken": "mock_refresh_token_admin123"
}
```

### Register Test
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "age": 25,
    "income": 50000,
    "state": "Karnataka"
  }'
```

### View All Users (Debug Endpoint)
```bash
curl http://localhost:3000/api/debug/users
```

---

## 🎯 What Works Now

### Authentication:
✅ User registration with in-memory storage
✅ User login with email/password
✅ Mock JWT tokens generated
✅ Admin account pre-configured
✅ Multiple users can register

### After Login:
✅ Redirect to dashboard
✅ Access to protected routes
✅ View personalized recommendations (mock data)
✅ Browse schemes
✅ View profile

---

## 📊 Current User Storage

Users are stored in memory (will be lost when server restarts):
- **admin@example.com** - Pre-configured admin user
- Any users you register will be added to the list

To see all registered users, visit:
```
http://localhost:3000/api/debug/users
```

---

## 🔄 Server Restart Note

**Important**: Since users are stored in memory, they will be lost when you restart the backend server. The admin account will always be available, but any users you register will need to be re-registered after a server restart.

---

## 🎊 Success!

Your authentication system is now working! You can:
1. ✅ Login with admin@example.com / password
2. ✅ Register new users
3. ✅ Access the dashboard
4. ✅ Test all protected routes

**Happy Testing! 🚀**
