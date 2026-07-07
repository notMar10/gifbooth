# 📸 GIFBooth – Browser-Based GIF Photobooth

GIFBooth is a modern, browser-based photobooth application that captures a series of photos and automatically converts them into animated GIFs. The application runs entirely on the client side, requiring no backend server or database, making it lightweight, fast, and easy to deploy on any static hosting platform such as Vercel, GitHub Pages, or Netlify.

Designed with a vintage photobooth aesthetic, GIFBooth provides a smooth and interactive experience while leveraging modern web technologies for camera access, image processing, and GIF generation.

---

## ✨ Features

* 📷 **Live Camera Preview**

  * Uses the browser's MediaDevices API for real-time webcam access.
  * Responsive preview optimized for desktop and mobile devices.

* ⏳ **Automatic Countdown Capture**

  * Countdown timer before each photo is taken.
  * Visual recording indicators and capture progress.

* 🎞️ **Animated GIF Generation**

  * Captures multiple frames and encodes them into high-quality animated GIFs.
  * Entire GIF creation process happens inside the browser.

* 🖼️ **Photobooth Style Frames**

  * Generate GIFs with customizable vintage borders.
  * Create stacked photo-strip style GIFs.
  * Personalized caption text.

* 🎨 **Customization Options**

  * Select border color.
  * Customize caption text.
  * Automatic or manual caption text color selection for readability.

* 💾 **Instant Download**

  * Download generated GIFs immediately.
  * No uploads or cloud processing required.

* 🔒 **Privacy Friendly**

  * Images never leave the user's device.
  * No server-side image storage.
  * No user accounts or login required.

* 📱 **Responsive Design**

  * Optimized for desktop, tablet, and mobile browsers.
  * Touch-friendly controls.

---

## 🛠️ Technologies Used

* HTML5
* CSS3
* Vanilla JavaScript (ES Modules)
* HTML5 Canvas API
* MediaDevices API (Webcam Access)
* Web Workers (Background GIF Encoding)
* GIF Encoding Library
* Vercel (Deployment)

---

## 📂 Project Structure

```text
photobooth-vercel/
│
├── index.html          # Main application interface
├── styles.css          # Application styling
├── photobooth.js       # Main application logic
├── gif-capture.js      # Frame capture and GIF generation
├── gif.worker.js       # Background GIF encoding worker
├── utils.js            # Helper functions
├── config.js           # Application configuration
├── vercel.json         # Vercel deployment configuration
└── package.json
```

---

## 🚀 How It Works

1. The user grants camera permission.
2. A live camera preview is displayed.
3. The user starts a capture session.
4. Multiple photos are taken automatically with countdown intervals.
5. Captured frames are processed into an animated GIF.
6. Optional photobooth borders and captions are applied.
7. The completed GIF becomes available for instant download.

---

## 💻 Running Locally

Because browsers restrict camera access on `file://`, the application should be served through a local web server.

Install dependencies (optional):

```bash
npm install
```

Start a local server:

```bash
npx serve .
```

Then open the provided localhost URL in your browser and allow camera access.

---

## 🌐 Deployment

This project is a static web application and can be deployed easily to platforms such as:

* Vercel
* GitHub Pages
* Netlify
* Firebase Hosting

HTTPS is required for browser camera access in production environments.

---

## 📌 Browser Requirements

* Google Chrome (Recommended)
* Microsoft Edge
* Mozilla Firefox
* Safari (Latest Version)

The application requires:

* Camera permission
* JavaScript enabled
* HTTPS (except localhost)

---

## 🔮 Future Improvements

Potential enhancements include:

* Photo filters and effects
* Multiple capture layouts
* QR code sharing
* Social media integration
* Cloud storage support
* Image editing tools
* Custom GIF frame duration
* Multiple animation styles

---

## 📄 License

This project is intended for educational, personal, and demonstration purposes. Feel free to modify and extend it according to your needs.

---

## 👨‍💻 Author

Developed as a browser-based GIF photobooth application using modern web technologies to provide a simple, responsive, and privacy-friendly photo capture experience.
