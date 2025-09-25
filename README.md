# Romantic Two-Day Surprise Web Application

A beautiful, full-stack web application designed for creating timed romantic surprises and puzzles over a two-day period.

## ✨ Features

- **Secure User Authentication**: Unicode-safe login with rolling session cookies
- **Timed Content Release**: Server-side validation ensures content is released at precise times
- **Interactive Puzzles**: Questions, hints, and answers with elegant animations
- **Media Support**: Images and videos with upload management
- **Admin Panel**: Complete control over schedule, content, and timing
- **Responsive Design**: Beautiful glassmorphism UI that works on all devices
- **Time Simulation**: Test any moment in the timeline for development

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (copy `.env` and update):
   ```bash
   # Update the admin credentials in .env
   LOGIN_USER=your_admin_username
   LOGIN_PASS=your_secure_admin_password
   SESSION_SECRET=your_random_session_secret
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - User interface: `http://localhost:8000`
   - Admin panel: `http://localhost:8000/admin-login.html`

## 📅 How to Edit Content

### Admin Panel Access
1. Go to `/admin-login.html`
2. Use the admin credentials from your `.env` file
3. Navigate through the three main sections:

### General Settings
- **Start/End Times**: Set the two-day window (supports minute precision)
- **Timezone**: Configure timezone (default: Europe/Istanbul)
- **Gift Message**: Customize the message shown during gift countdown mode
- **Simulation Time**: Test any moment in the timeline for development

### Day Controller
- **Visual Timeline**: See all scheduled content with precise times
- **Time Pickers**: Support for exact minute scheduling
- **Bulk Operations**: Import/Export entire schedules as JSON
- **Entry Management**: Add, edit, duplicate, and delete entries
- **Auto-sorting**: Entries automatically sort by time

### Content Editor
- **Content Types**: Message, Question, Media, or Mixed
- **Rich Content**: Support for text, images, videos, and interactive elements
- **Question System**: Add questions with multiple hints and custom timing
- **Special Features**: Pre-content notes, post-answer messages, CTA buttons
- **Media Upload**: Direct upload to `/content/media/` with conflict resolution

## 🎯 Special Features

### Password Protection (17:00 Slot)
The special entry at 17:00 triggers "Gift Mode" when the correct password is entered:
- **Correct Answer**: "İYİ Kİ DOĞDUN SEVGİLİM" (18 characters)
- **Unicode Support**: Handles Turkish characters with NFC normalization
- **Gift Countdown**: Shows special countdown to midnight with custom message

### Hint System
- **10-minute Timer**: Hints unlock every 10 minutes for question entries
- **Progressive Disclosure**: Reveals hints one at a time
- **Visual Feedback**: Buttons pulse and glow when hints become available

### Content Persistence
- **Scrollable Timeline**: All unlocked content remains visible
- **Device Memory**: Sessions persist for 90 days
- **Graceful Degradation**: Missing media files don't break the experience

## 🔧 Technical Details

### Authentication
- **User Login**: `kuzeyyıldızı` / `1425925` (Unicode normalized)
- **Session Management**: Rolling 90-day cookies with security flags
- **Rate Limiting**: Protection against brute force attempts

### File Structure
```
├── server/
│   ├── index.js              # Express app setup
│   ├── routes/
│   │   ├── public.js         # Public API endpoints
│   │   └── admin.js          # Admin API endpoints  
│   └── lib/
│       ├── auth.js           # Authentication logic
│       ├── time.js           # Timezone and scheduling
│       └── jsonStore.js      # File-based data storage
├── public/
│   ├── *.html               # Frontend pages
│   ├── css/styles.css       # Glassmorphism styling
│   ├── js/
│   │   ├── app.js           # Main application logic
│   │   ├── admin.js         # Admin panel functionality
│   │   └── animation/       # Animation modules
└── content/
    ├── config.json          # Application configuration
    ├── schedule.json        # Content schedule
    └── media/               # Uploaded media files
```

### Security Notes
- Always change default admin credentials in production
- Use a strong, random session secret
- HTTPS is recommended for production deployment
- File upload size limits are configurable

### Unicode Support
The application properly handles Turkish characters through:
- **NFC Normalization**: Consistent Unicode representation
- **Case-insensitive Comparison**: Supports various input methods
- **Safe Storage**: Preserves special characters in JSON files

## 🎨 Customization

### Styling
- **CSS Variables**: Easy color scheme changes in `/public/css/styles.css`
- **Typography**: Fraunces for headings, Inter for body text
- **Responsive Breakpoints**: Mobile-first design with tablet and desktop variants
- **Dark Mode**: Automatic support via `prefers-color-scheme`

### Content Structure
Each schedule entry supports:
- `atIso`: Exact release time in ISO format
- `type`: message, question, media, or mixed
- `message`: Main content text (supports line breaks)
- `media`: Array of images/videos with sources
- `question`: Interactive question text
- `answer`: Expected answer (Unicode normalized)
- `hints`: Array of progressive hints
- `postAnswerMessage`: Success message after correct answer
- `preContentNote`: Warning or instruction above content
- `cta`: Call-to-action button with modal content

## 🕐 Time Management

### Server-Side Validation
- All time checks happen on the server
- Supports timezone-aware scheduling
- Prevents client-side time manipulation

### Simulation Mode
- Test any moment in the timeline
- Global override affects all users
- Clear visual indication when active
- Perfect for development and testing

This application creates an immersive, romantic experience that unfolds over exactly two days with precise timing, beautiful animations, and engaging interactive elements.