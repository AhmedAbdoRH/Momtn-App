# MyApp1 React Native

This is a React Native version of the original Android app built with Kotlin and Jetpack Compose.

## Features

- Simple greeting screen displaying "Hello Ahmed!"
- Equivalent functionality to the original Android app
- Clean component architecture
- Theme system similar to Material Design
- TypeScript support

## Project Structure

```
MyApp1ReactNative/
├── App.tsx                 # Main application component
├── components/
│   └── Greeting.tsx        # Greeting component (equivalent to Android Composable)
├── theme/
│   └── index.ts           # Theme configuration (colors, typography, spacing)
├── android/               # Android-specific code
├── ios/                   # iOS-specific code
└── package.json           # Dependencies and scripts
```

## Conversion from Android

This React Native app is equivalent to the original Android app with the following mappings:

### Android (Kotlin/Compose) → React Native (TypeScript/JSX)

- `MainActivity.kt` → `App.tsx`
- `@Composable fun Greeting()` → `Greeting` component
- `Color.kt` → `theme/index.ts` (Colors)
- Material Design theme → Custom theme system
- Jetpack Compose `Text` → React Native `Text`
- Compose `Scaffold` → React Native `SafeAreaView`

## Getting Started

### Prerequisites

- Node.js (>= 20)
- React Native development environment
- Android Studio (for Android development)
- Xcode (for iOS development on macOS)

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the App

#### Android
```bash
npm run android
```

#### iOS (macOS only)
```bash
npm run ios
```

### Development

Start the Metro bundler:
```bash
npm start
```

## Building for Production

### Android
```bash
cd android
./gradlew assembleRelease
```

### iOS
Build through Xcode or:
```bash
npx react-native build-ios --mode Release
```

## Testing

Run tests:
```bash
npm test
```

## Comparison with Original Android App

| Feature | Android (Kotlin/Compose) | React Native (TypeScript) |
|---------|-------------------------|---------------------------|
| Language | Kotlin | TypeScript |
| UI Framework | Jetpack Compose | React Native |
| Main Component | MainActivity | App component |
| Greeting Component | @Composable Greeting() | Greeting functional component |
| Styling | Compose modifiers | StyleSheet |
| Theme System | Material Design 3 | Custom theme object |
| Navigation | Compose Navigation | React Navigation (can be added) |
| State Management | Compose State | React hooks |

## Next Steps

To further enhance this app, you could add:

- Navigation between screens
- State management (Redux, Zustand, etc.)
- API integration
- Local storage
- Push notifications
- Testing (Jest, Detox)
- CI/CD pipeline