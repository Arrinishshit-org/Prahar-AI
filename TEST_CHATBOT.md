# Quick Chatbot Test Guide

## ✅ System Status
- Backend: Running on http://localhost:3000 with 4,664 schemes cached
- Frontend: Running on http://localhost:5173
- Chatbot: Fixed and ready to test!

## 🚀 Quick Test (5 minutes)

### Step 1: Login
1. Open http://localhost:5173
2. Login with:
   - Email: `admin@example.com`
   - Password: `password`

### Step 2: Open Chatbot
- Click the floating chat button (bottom right corner)
- Or navigate to http://localhost:5173/assistant

### Step 3: Test These Queries

**Test 1: Profile Query**
```
Type: "Show my profile"
Expected: Shows your profile details with completeness percentage
```

**Test 2: General Scheme Query**
```
Type: "Find schemes for me"
Expected: Shows 5 schemes with names, categories, and descriptions
```

**Test 3: Student Schemes**
```
Type: "I am a student, show me scholarship schemes"
Expected: Shows education/scholarship schemes
```

**Test 4: Profile Update**
```
Type: "My age is 25"
Expected: "✅ Updated your age to 25 years" + scheme recommendations
```

**Test 5: State-Specific**
```
Type: "I live in Maharashtra"
Expected: Updates state and shows relevant schemes
```

**Test 6: Category-Specific**
```
Type: "Show me agriculture schemes"
Expected: Shows farming/agriculture related schemes
```

## ✅ What Should Work

1. **Fast Responses**: Chatbot responds in < 1 second (using cache)
2. **Scheme Display**: Shows 5 schemes with:
   - Scheme name
   - Category (if available)
   - Description (truncated to 120 chars)
3. **Profile Updates**: Updates age, income, state, employment, education
4. **Suggestions**: Shows 3 helpful suggestions after each response
5. **Error Handling**: Graceful fallback if something fails

## ❌ What Won't Work (Expected)

1. **Neo4j Features**: Advanced graph queries (using cache instead)
2. **Database Persistence**: Profile updates are in-memory only
3. **Eligibility Scores**: Simplified scoring (cache-based, not graph-based)

## 🐛 If Something Goes Wrong

### Chatbot doesn't respond
1. Check browser console (F12) for errors
2. Verify you're logged in (check localStorage for 'accessToken')
3. Check backend is running: http://localhost:3000/health

### No schemes shown
1. Check backend logs for "✅ Cached 4664 schemes"
2. Try a different query (e.g., "show me schemes")
3. Refresh the page and try again

### Profile updates don't work
1. Check backend logs for "✅ Updated your..."
2. Try exact format: "My age is 25" or "I live in Maharashtra"
3. Verify you're logged in

## 📊 Expected Results

### Query: "Find schemes for me"
```
Great! Based on your profile (Any, Age: Not specified), here are the top schemes for you:

1. Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)
   Eligibility: 75%
   Financial assistance to farmers...

2. National Scholarship Portal
   Eligibility: 70%
   Scholarships for students...

[... 3 more schemes ...]

✅ Check the Dashboard to see all 10 recommended schemes and apply!
```

### Query: "My age is 25"
```
✅ Updated your age to 25 years. Great! Based on your profile (Any, Age: 25), here are the top schemes for you:

[... schemes list ...]
```

## 🎯 Success Indicators

✅ Chatbot loads without errors
✅ Responds to queries in < 1 second
✅ Shows 5 relevant schemes
✅ Includes scheme names and descriptions
✅ Provides 3 suggestions after each response
✅ Updates profile when requested
✅ Handles errors gracefully

## 📝 Notes

- The chatbot is using the **cache** (4,664 schemes from India.gov.in)
- Neo4j is **not required** - cache fallback works perfectly
- All 4,664 schemes are searchable by keywords
- Profile updates are stored in memory (not persisted)
- The system is production-ready for demo purposes!

## 🔧 Technical Details

**Cache Search Keywords:**
- "scholarship" → education schemes
- "student" → student schemes
- "agriculture" → farming schemes
- "health" → medical schemes
- "scheme" → general search

**Profile Update Patterns:**
- Age: "my age is 25", "age is 25"
- Income: "my income is 500000", "income is 500000"
- State: "I live in Maharashtra", "my state is Maharashtra"
- Employment: "I am a student", "I am unemployed"
- Education: "my education is graduate"

## 🎉 You're All Set!

The chatbot is now fully functional and ready to use. It's connected to the schemes database (via cache) and can help users discover relevant government schemes based on their profile.

**Enjoy testing!** 🚀
