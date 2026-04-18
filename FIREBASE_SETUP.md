# Firebase SMS OTP Setup Guide

## 🚀 Quick Setup for SMS OTP

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or use existing)
3. Enable **Phone Authentication**:
   - Go to Authentication → Sign-in method
   - Find "Phone" and click enable
   - Accept terms

### Step 3: Add Web App
1. Click the gear icon → Project settings
2. Scroll to "Your apps" section
3. Click "Add app" → Web app (</>)
4. Register app with name "NSP Scholar"
5. **Copy the config values**

### Step 4: Update Firebase Config
Edit `src/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your API key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 5: Deploy
```bash
npm run build
git add .
git commit -m "Complete SMS OTP setup"
git push origin main
```

## 📱 Testing SMS OTP

1. Visit your site: `https://chavansheetal.github.io`
2. Go to Registration
3. Fill form with real mobile number
4. Click "Proceed" - you'll receive real SMS!
5. Enter the 6-digit code from SMS

## 🔒 Security Features

- ✅ **Real SMS delivery** (not shown on screen)
- ✅ **reCAPTCHA protection** (prevents spam)
- ✅ **Firebase encryption**
- ✅ **Rate limiting**
- ✅ **OTP expiration** (usually 5 minutes)

## 💰 Cost

- **Free tier**: 10,000 SMS/month
- **Paid**: ~$0.01-0.06 per SMS
- **No credit card required** for testing

## 🐛 Troubleshooting

**"Invalid phone number"**: Use format +91XXXXXXXXXX
**"reCAPTCHA failed"**: Refresh page and try again
**"Too many requests"**: Wait 5-10 minutes
**"OTP expired"**: Request new OTP

## 📞 Support

If SMS doesn't work:
1. Check Firebase Console → Authentication → Phone numbers
2. Verify your config values
3. Check browser console for errors
4. Ensure phone number format is correct