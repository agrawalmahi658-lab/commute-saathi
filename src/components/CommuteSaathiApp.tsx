import { useState, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast, Toaster } from "sonner";
import {
  Mic, MapPin, Shield, ChevronRight, Phone,
  Navigation, Clock, Zap, CheckCircle,
  ArrowLeft, Volume2, Signal, Battery, Wifi,
  Globe, X, Star, Send, Download,
  AlertCircle, AlertTriangle, Home, MessageCircle,
  User, UserCheck, Truck, GraduationCap, Briefcase,
  Bell, Lock, Eye, RefreshCw, UserPlus, LogIn,
  Activity, Sparkles, ChevronDown,
} from "lucide-react";
import { askSaathi } from "@/lib/ai.functions";
import { suggestRoutes, fallbackRoutes } from "@/lib/routes.functions";
import { useSpeech } from "@/hooks/use-speech";
import { useWage } from "@/hooks/use-commute-data";
import { useGeolocation, geocodePlace, useAddressFromCoords } from "@/hooks/use-geolocation";
import { useCommuteStore, CommuteStoreProvider } from "@/hooks/use-commute-store";
import { LiveMap } from "@/components/LiveMap";
import { signInWithGoogle, startPhoneSignIn, confirmOtp, resetRecaptcha } from "@/lib/auth-service";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { upsertUserProfile, SosContacts, type SosContact } from "@/lib/firestore-service";

// ─── SCREEN TYPE ───────────────────────────────────────────────────────────────
type Screen =
  | "splash" | "language" | "auth" | "otp"
  | "userType" | "permissions" | "emergencySetup" | "aiPersonalization"
  | "home" | "voice" | "routes" | "routeDetail"
  | "wageGuardian" | "safety" | "safeCompanion" | "womenScore" | "sos" | "profile";

type NavFn = (s: Screen) => void;

// ─── LANGUAGE SYSTEM ──────────────────────────────────────────────────────────
type LangCode = "en" | "hi" | "ta" | "te";

const TR = {
  en: {
    tagline: "Every Commuter Deserves a Saathi",
    subtitle: "Your AI travel companion for smarter, safer & cheaper commutes across Bharat.",
    getStarted: "Get Started →",
    greeting: (name?: string) => `Good Morning${name ? `, ${name}` : ""} 🌅`,
    features: ["Voice AI Route Engine", "Wage Guardian", "Safety Layer", "Journey Guardian", "SOS Emergency", "Multilingual"],
    featureDescs: ["Talk to plan routes", "Protect your income", "Score & live tracking", "Live step-by-step nav", "One-tap safety alert", "Hindi, Tamil, Telugu"],
    chooseLanguage: "Choose Your Language",
    langSubtitle: "Select your preferred language",
    signIn: "Sign In",
    signInWith: "Sign in with",
    google: "Google",
    phone: "Phone Number",
    guestMode: "Continue as Guest",
    guestDesc: "No account needed",
    enterPhone: "Enter phone number",
    phonePlaceholder: "+91 9876543210",
    sendOTP: "Send OTP",
    enterOTP: "Enter OTP",
    otpSent: "OTP sent to",
    verify: "Verify & Continue",
    whoAreYou: "Who are you?",
    userTypes: ["Daily Wage Worker", "Student", "Delivery Partner", "Woman Traveler", "Office Worker", "Senior Citizen"],
    userTypeIcons: ["👷", "🎓", "🛵", "🙍‍♀️", "💼", "🧓"],
    userTypeDescs: [
      "Prioritize cost savings",
      "Balance cost & safety",
      "Prioritize speed",
      "Prioritize safety",
      "Best time + comfort",
      "Accessibility & comfort",
    ],
    continue: "Continue →",
    permissionsTitle: "Allow Permissions",
    permissionsSubtitle: "For the best Saathi experience",
    permissions: ["Location", "Microphone", "Notifications", "Background Location"],
    permissionsDesc: [
      "Required for live navigation & route planning",
      "Required for voice commands & AI assistant",
      "Required for route alerts & safety updates",
      "Required for emergency protection & SOS",
    ],
    allow: "Allow",
    skip: "Skip",
    allowAll: "Allow All & Continue",
    emergencyTitle: "Emergency Contacts",
    emergencySubtitle: "Add people to alert in SOS",
    addContact: "+ Add Contact",
    nameLabel: "Name",
    phoneLabel: "Phone Number",
    relationLabel: "Relation",
    save: "Save Contact",
    skipForNow: "Skip for now",
    aiTitle: "Personalizing Your Saathi",
    aiSubtitle: "AI is learning your commute patterns…",
    whereToGo: "Where do you want to go?",
    voiceAIBadge: "AI Powered",
    wageGuardianBadge: "Income Protect",
    safetyBadge: "9.4 / 10",
    journeyBadge: "Live GPS",
    sosBadge: "Always Ready",
    multilingualBadge: "4 Languages",
    hackathonLabel: "Hackathon Features",
    voiceGreet: "Namaste! I am Saathi 👋",
    voiceHint: "Tap the mic and ask me anything about your commute.",
    suggestions: [
      "I want to go to the railway station",
      "Cheapest route to Andheri?",
      "Is my route safe at night?",
      "Wage vs commute cost today?",
    ],
    listening: "Listening… tap to stop",
    processing: "Saathi is thinking…",
    speaking: "Speaking… tap to stop",
    voiceTip: "Tap the mic to talk",
    safetyTitle: "Safety Layer 🛡️",
    safetySubtitle: "Route Safety Intelligence",
    sosTitle: "SOS & Help",
    sosActivated: "SOS ACTIVATED",
    sosTap: "Tap to activate",
    sosActivatedMsg: "📍 Location shared with contacts",
    sosNotified: "Police notified · ETA tracking active",
    emergencySends: "One tap sends:",
    womenScore: "Women's Confidence 🌙",
    safeCompanion: "Safe Companion 👭",
    wageTitle: "Wage Guardian 💰",
    wageSubtitle: "Daily Budget Tracker",
    sosCopied: "📍 Live location link copied!",
    sosShared: "Emergency message ready — share via WhatsApp",
    shakeDetected: "Shake detected! Activating SOS…",
  },
  hi: {
    tagline: "हर यात्री को एक साथी मिलना चाहिए",
    subtitle: "भारत भर में स्मार्ट, सुरक्षित और सस्ती यात्रा के लिए आपका AI साथी।",
    getStarted: "शुरू करें →",
    greeting: (name?: string) => `शुभ प्रभात${name ? `, ${name}` : ""} 🌅`,
    features: ["वॉयस AI रूट इंजन", "वेज गार्जियन", "सेफ्टी लेयर", "जर्नी गार्जियन", "SOS आपातकाल", "बहुभाषी"],
    featureDescs: ["बोलकर रास्ता बताएं", "अपनी कमाई बचाएं", "स्कोर और लाइव ट्रैकिंग", "लाइव नेविगेशन", "एक टैप में मदद", "हिंदी, तमिल, तेलुगू"],
    chooseLanguage: "अपनी भाषा चुनें",
    langSubtitle: "अपनी पसंदीदा भाषा चुनें",
    signIn: "साइन इन करें",
    signInWith: "के साथ साइन इन करें",
    google: "Google",
    phone: "फ़ोन नंबर",
    guestMode: "अतिथि के रूप में जारी रखें",
    guestDesc: "खाता जरूरी नहीं",
    enterPhone: "फ़ोन नंबर डालें",
    phonePlaceholder: "+91 9876543210",
    sendOTP: "OTP भेजें",
    enterOTP: "OTP डालें",
    otpSent: "OTP भेजा गया",
    verify: "सत्यापित करें और जारी रखें",
    whoAreYou: "आप कौन हैं?",
    userTypes: ["दैनिक मजदूर", "छात्र", "डिलीवरी पार्टनर", "महिला यात्री", "ऑफिस वर्कर", "वरिष्ठ नागरिक"],
    userTypeIcons: ["👷", "🎓", "🛵", "🙍‍♀️", "💼", "🧓"],
    userTypeDescs: [
      "पैसे बचाना प्राथमिकता",
      "लागत और सुरक्षा संतुलन",
      "तेज रास्ते की प्राथमिकता",
      "सुरक्षा की प्राथमिकता",
      "सर्वोत्तम समय + आराम",
      "सुविधा और आराम",
    ],
    continue: "जारी रखें →",
    permissionsTitle: "अनुमति दें",
    permissionsSubtitle: "बेहतर साथी अनुभव के लिए",
    permissions: ["स्थान", "माइक्रोफोन", "सूचनाएं", "बैकग्राउंड स्थान"],
    permissionsDesc: [
      "लाइव नेविगेशन के लिए जरूरी",
      "वॉयस कमांड के लिए जरूरी",
      "रूट अलर्ट के लिए जरूरी",
      "SOS सुरक्षा के लिए जरूरी",
    ],
    allow: "अनुमति दें",
    skip: "छोड़ें",
    allowAll: "सभी अनुमति दें और जारी रखें",
    emergencyTitle: "आपातकालीन संपर्क",
    emergencySubtitle: "SOS में अलर्ट करने के लिए लोगों को जोड़ें",
    addContact: "+ संपर्क जोड़ें",
    nameLabel: "नाम",
    phoneLabel: "फ़ोन नंबर",
    relationLabel: "संबंध",
    save: "संपर्क सहेजें",
    skipForNow: "अभी के लिए छोड़ें",
    aiTitle: "आपका साथी तैयार हो रहा है",
    aiSubtitle: "AI आपके कम्यूट पैटर्न सीख रहा है…",
    whereToGo: "कहाँ जाना है?",
    voiceAIBadge: "AI पावर्ड",
    wageGuardianBadge: "आय सुरक्षा",
    safetyBadge: "9.4 / 10",
    journeyBadge: "लाइव GPS",
    sosBadge: "हमेशा तैयार",
    multilingualBadge: "4 भाषाएं",
    hackathonLabel: "मुख्य सुविधाएं",
    voiceGreet: "नमस्ते! मैं Saathi हूँ 👋",
    voiceHint: "माइक दबाएं और अपनी यात्रा के बारे में पूछें।",
    suggestions: [
      "मुझे रेलवे स्टेशन जाना है",
      "अंधेरी का सबसे सस्ता रास्ता?",
      "क्या मेरा रास्ता रात में सुरक्षित है?",
      "आज वेज बनाम कम्यूट लागत?",
    ],
    listening: "सुन रहा हूँ… रोकने के लिए टैप करें",
    processing: "Saathi सोच रहा है…",
    speaking: "बोल रहा हूँ… रोकने के लिए टैप करें",
    voiceTip: "बात करने के लिए माइक दबाएं",
    safetyTitle: "सेफ्टी लेयर 🛡️",
    safetySubtitle: "रूट सुरक्षा इंटेलिजेंस",
    sosTitle: "SOS और मदद",
    sosActivated: "SOS सक्रिय",
    sosTap: "सक्रिय करने के लिए टैप करें",
    sosActivatedMsg: "📍 स्थान संपर्कों के साथ साझा किया",
    sosNotified: "पुलिस को सूचित किया · ETA ट्रैकिंग सक्रिय",
    emergencySends: "एक टैप भेजता है:",
    womenScore: "महिला कॉन्फिडेंस 🌙",
    safeCompanion: "सेफ कम्पेनियन 👭",
    wageTitle: "वेज गार्जियन 💰",
    wageSubtitle: "दैनिक बजट ट्रैकर",
    sosCopied: "📍 लाइव लोकेशन लिंक कॉपी हुआ!",
    sosShared: "आपातकालीन संदेश तैयार — WhatsApp से भेजें",
    shakeDetected: "फ़ोन हिलाने का पता चला! SOS सक्रिय हो रहा है…",
  },
  ta: {
    tagline: "ஒவ்வொரு பயணியும் ஒரு சாத்தியை பெற வேண்டும்",
    subtitle: "பாரத் முழுவதும் புத்திசாலியான, பாதுகாப்பான மற்றும் மலிவான பயணங்களுக்கான உங்கள் AI துணை.",
    getStarted: "தொடங்கு →",
    greeting: (name?: string) => `காலை வணக்கம்${name ? `, ${name}` : ""} 🌅`,
    features: ["வாய்ஸ் AI ரூட் இஞ்சின்", "வேஜ் கார்டியன்", "பாதுகாப்பு அடுக்கு", "பயண கார்டியன்", "SOS அவசரநிலை", "பலமொழி"],
    featureDescs: ["பேசி பாதை திட்டமிடுங்கள்", "உங்கள் வருமானத்தை காப்பாற்றுங்கள்", "மதிப்பெண் & நேரடி கண்காணிப்பு", "நேரடி வழிகாட்டுதல்", "ஒரு தட்டில் உதவி", "தமிழ், ஹிந்தி, தெலுங்கு"],
    chooseLanguage: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
    langSubtitle: "விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும்",
    signIn: "உள்நுழைக",
    signInWith: "உடன் உள்நுழைக",
    google: "Google",
    phone: "தொலைபேசி எண்",
    guestMode: "விருந்தினராக தொடரவும்",
    guestDesc: "கணக்கு தேவையில்லை",
    enterPhone: "தொலைபேசி எண் உள்ளிடவும்",
    phonePlaceholder: "+91 9876543210",
    sendOTP: "OTP அனுப்பு",
    enterOTP: "OTP உள்ளிடவும்",
    otpSent: "OTP அனுப்பப்பட்டது",
    verify: "சரிபார்த்து தொடரவும்",
    whoAreYou: "நீங்கள் யார்?",
    userTypes: ["தினசரி கூலி தொழிலாளி", "மாணவர்", "டெலிவரி பார்ட்னர்", "பெண் பயணி", "அலுவலக ஊழியர்", "மூத்த குடிமகன்"],
    userTypeIcons: ["👷", "🎓", "🛵", "🙍‍♀️", "💼", "🧓"],
    userTypeDescs: ["செலவு சேமிப்பு முன்னுரிமை", "செலவு & பாதுகாப்பு சமநிலை", "வேகத்திற்கு முன்னுரிமை", "பாதுகாப்பிற்கு முன்னுரிமை", "சிறந்த நேரம் + வசதி", "அணுகல் & வசதி"],
    continue: "தொடரவும் →",
    permissionsTitle: "அனுமதி வழங்கவும்",
    permissionsSubtitle: "சிறந்த சாத்தி அனுபவத்திற்கு",
    permissions: ["இருப்பிடம்", "மைக்ரோஃபோன்", "அறிவிப்புகள்", "பின்னணி இருப்பிடம்"],
    permissionsDesc: ["நேரடி வழிசெலுத்தலுக்கு தேவை", "குரல் கட்டளைகளுக்கு தேவை", "வழி எச்சரிக்கைகளுக்கு தேவை", "SOS பாதுகாப்பிற்கு தேவை"],
    allow: "அனுமதி",
    skip: "தவிர்க்கவும்",
    allowAll: "அனைத்தையும் அனுமதித்து தொடரவும்",
    emergencyTitle: "அவசர தொடர்புகள்",
    emergencySubtitle: "SOS-ல் அறிவிக்க நபர்களை சேர்க்கவும்",
    addContact: "+ தொடர்பு சேர்க்கவும்",
    nameLabel: "பெயர்",
    phoneLabel: "தொலைபேசி எண்",
    relationLabel: "உறவு",
    save: "தொடர்பை சேமிக்கவும்",
    skipForNow: "இப்போது தவிர்க்கவும்",
    aiTitle: "உங்கள் சாத்தி தயாராகிறது",
    aiSubtitle: "AI உங்கள் பயண முறைகளை கற்றுக்கொள்கிறது…",
    whereToGo: "எங்கே போக விரும்புகிறீர்கள்?",
    voiceAIBadge: "AI இயக்கப்பட்டது",
    wageGuardianBadge: "வருமான பாதுகாப்பு",
    safetyBadge: "9.4 / 10",
    journeyBadge: "நேரடி GPS",
    sosBadge: "எப்போதும் தயார்",
    multilingualBadge: "4 மொழிகள்",
    hackathonLabel: "முக்கிய அம்சங்கள்",
    voiceGreet: "வணக்கம்! நான் சாத்தி 👋",
    voiceHint: "மைக்கை தட்டி உங்கள் பயணத்தைப் பற்றி கேளுங்கள்.",
    suggestions: ["நான் ரயில்வே ஸ்டேஷனுக்கு போக வேண்டும்", "அந்தேரிக்கு மலிவான வழி?", "இரவில் என் பாதை பாதுகாப்பானதா?", "இன்று ஊதியம் vs பயண செலவு?"],
    listening: "கேட்கிறேன்… நிறுத்த தட்டவும்",
    processing: "சாத்தி யோசிக்கிறார்…",
    speaking: "பேசுகிறேன்… நிறுத்த தட்டவும்",
    voiceTip: "பேச மைக்கை தட்டவும்",
    safetyTitle: "பாதுகாப்பு அடுக்கு 🛡️",
    safetySubtitle: "வழி பாதுகாப்பு நுண்ணறிவு",
    sosTitle: "SOS மற்றும் உதவி",
    sosActivated: "SOS செயல்படுத்தப்பட்டது",
    sosTap: "செயல்படுத்த தட்டவும்",
    sosActivatedMsg: "📍 இருப்பிடம் தொடர்புகளுடன் பகிரப்பட்டது",
    sosNotified: "போலீஸ் அறிவிக்கப்பட்டது · ETA கண்காணிப்பு செயல்படுகிறது",
    emergencySends: "ஒரு தட்டு அனுப்புகிறது:",
    womenScore: "பெண்களின் நம்பிக்கை 🌙",
    safeCompanion: "பாதுகாப்பான துணை 👭",
    wageTitle: "வேஜ் கார்டியன் 💰",
    wageSubtitle: "தினசரி பட்ஜெட் கண்காணிப்பு",
    sosCopied: "📍 நேரடி இருப்பிட இணைப்பு நகலெடுக்கப்பட்டது!",
    sosShared: "அவசர செய்தி தயார் — WhatsApp மூலம் அனுப்பவும்",
    shakeDetected: "அசைவு கண்டறியப்பட்டது! SOS செயல்படுத்தப்படுகிறது…",
  },
  te: {
    tagline: "ప్రతి ప్రయాణికుడికి ఒక సాధి ఉండాలి",
    subtitle: "భారతదేశం అంతటా తెలివైన, సురక్షితమైన మరియు చౌకైన ప్రయాణాలకు మీ AI సాథి.",
    getStarted: "ప్రారంభించండి →",
    greeting: (name?: string) => `శుభోదయం${name ? `, ${name}` : ""} 🌅`,
    features: ["వాయిస్ AI రూట్ ఇంజిన్", "వేజ్ గార్డియన్", "సేఫ్టీ లేయర్", "జర్నీ గార్డియన్", "SOS అత్యవసరం", "బహుభాషీయ"],
    featureDescs: ["మాట్లాడి మార్గం ప్లాన్ చేయండి", "మీ ఆదాయాన్ని రక్షించుకోండి", "స్కోర్ & లైవ్ ట్రాకింగ్", "లైవ్ నావిగేషన్", "ఒక్క నొక్కులో సహాయం", "హిందీ, తమిళ్, తెలుగు"],
    chooseLanguage: "మీ భాషను ఎంచుకోండి",
    langSubtitle: "మీకు నచ్చిన భాషను ఎంచుకోండి",
    signIn: "సైన్ ఇన్ చేయండి",
    signInWith: "తో సైన్ ఇన్ చేయండి",
    google: "Google",
    phone: "ఫోన్ నంబర్",
    guestMode: "అతిథిగా కొనసాగండి",
    guestDesc: "ఖాతా అవసరం లేదు",
    enterPhone: "ఫోన్ నంబర్ నమోదు చేయండి",
    phonePlaceholder: "+91 9876543210",
    sendOTP: "OTP పంపండి",
    enterOTP: "OTP నమోదు చేయండి",
    otpSent: "OTP పంపబడింది",
    verify: "ధృవీకరించి కొనసాగండి",
    whoAreYou: "మీరు ఎవరు?",
    userTypes: ["రోజువారీ కూలీ", "విద్యార్థి", "డెలివరీ పార్టనర్", "మహిళా ప్రయాణికురాలు", "కార్యాలయ ఉద్యోగి", "వృద్ధ పౌరుడు"],
    userTypeIcons: ["👷", "🎓", "🛵", "🙍‍♀️", "💼", "🧓"],
    userTypeDescs: ["ఖర్చు ఆదా ప్రాధాన్యత", "ఖర్చు & భద్రత సమతుల్యం", "వేగానికి ప్రాధాన్యత", "భద్రతకు ప్రాధాన్యత", "అత్యుత్తమ సమయం + సౌకర్యం", "అందుబాటు & సౌకర్యం"],
    continue: "కొనసాగండి →",
    permissionsTitle: "అనుమతులు ఇవ్వండి",
    permissionsSubtitle: "అత్యుత్తమ సాథి అనుభవం కోసం",
    permissions: ["స్థానం", "మైక్రోఫోన్", "నోటిఫికేషన్లు", "బ్యాక్‌గ్రౌండ్ స్థానం"],
    permissionsDesc: ["లైవ్ నావిగేషన్ కోసం అవసరం", "వాయిస్ కమాండ్‌ల కోసం అవసరం", "రూట్ అలర్ట్‌ల కోసం అవసరం", "SOS రక్షణ కోసం అవసరం"],
    allow: "అనుమతించండి",
    skip: "దాటవేయి",
    allowAll: "అన్నింటికీ అనుమతించి కొనసాగండి",
    emergencyTitle: "అత్యవసర పరిచయాలు",
    emergencySubtitle: "SOS లో హెచ్చరించడానికి వ్యక్తులను జోడించండి",
    addContact: "+ పరిచయం జోడించండి",
    nameLabel: "పేరు",
    phoneLabel: "ఫోన్ నంబర్",
    relationLabel: "సంబంధం",
    save: "పరిచయాన్ని సేవ్ చేయండి",
    skipForNow: "ఇప్పుడు దాటవేయి",
    aiTitle: "మీ సాథి సిద్ధమవుతోంది",
    aiSubtitle: "AI మీ ప్రయాణ నమూనాలను నేర్చుకుంటోంది…",
    whereToGo: "మీరు ఎక్కడికి వెళ్ళాలనుకుంటున్నారు?",
    voiceAIBadge: "AI ఆధారిత",
    wageGuardianBadge: "ఆదాయ రక్షణ",
    safetyBadge: "9.4 / 10",
    journeyBadge: "లైవ్ GPS",
    sosBadge: "ఎప్పుడూ సిద్ధంగా",
    multilingualBadge: "4 భాషలు",
    hackathonLabel: "ముఖ్య లక్షణాలు",
    voiceGreet: "నమస్కారం! నేను సాథి 👋",
    voiceHint: "మైక్ నొక్కి మీ ప్రయాణం గురించి అడగండి.",
    suggestions: ["నాకు రైల్వే స్టేషన్‌కు వెళ్ళాలి", "అంధేరికి చౌకైన మార్గం?", "రాత్రి నా మార్గం సురక్షితమేనా?", "ఈరోజు వేజ్ vs ప్రయాణ ఖర్చు?"],
    listening: "వింటున్నాను… ఆపడానికి నొక్కండి",
    processing: "సాథి ఆలోచిస్తోంది…",
    speaking: "మాట్లాడుతున్నాను… ఆపడానికి నొక్కండి",
    voiceTip: "మాట్లాడటానికి మైక్ నొక్కండి",
    safetyTitle: "సేఫ్టీ లేయర్ 🛡️",
    safetySubtitle: "రూట్ సేఫ్టీ ఇంటెలిజెన్స్",
    sosTitle: "SOS మరియు సహాయం",
    sosActivated: "SOS సక్రియం",
    sosTap: "సక్రియం చేయడానికి నొక్కండి",
    sosActivatedMsg: "📍 స్థానం పరిచయాలతో భాగస్వామ్యం చేయబడింది",
    sosNotified: "పోలీస్ నోటిఫై అయింది · ETA ట్రాకింగ్ సక్రియం",
    emergencySends: "ఒక్క నొక్కు పంపుతుంది:",
    womenScore: "మహిళా విశ్వాసం 🌙",
    safeCompanion: "సేఫ్ కంపానియన్ 👭",
    wageTitle: "వేజ్ గార్డియన్ 💰",
    wageSubtitle: "రోజువారీ బడ్జెట్ ట్రాకర్",
    sosCopied: "📍 లైవ్ లొకేషన్ లింక్ కాపీ అయింది!",
    sosShared: "అత్యవసర సందేశం సిద్ధంగా ఉంది — WhatsApp ద్వారా పంపండి",
    shakeDetected: "షేక్ గుర్తించబడింది! SOS సక్రియమవుతోంది…",
  },
} as const;

// ─── LANGUAGE CONTEXT ─────────────────────────────────────────────────────────
type Translations = typeof TR["en"];
const LangCtx = createContext<{ lang: LangCode; t: Translations; setLang: (l: LangCode) => void }>({
  lang: "en", t: TR.en as Translations, setLang: () => {},
});
function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(() => {
    try { return (localStorage.getItem("saathi_lang") as LangCode) || "en"; } catch { return "en"; }
  });
  const setLang = (l: LangCode) => { setLangState(l); try { localStorage.setItem("saathi_lang", l); } catch {} };
  return <LangCtx.Provider value={{ lang, t: TR[lang] as Translations, setLang }}>{children}</LangCtx.Provider>;
}
const useLang = () => useContext(LangCtx);

// ─── APP STATE CONTEXT ────────────────────────────────────────────────────────
interface AppState {
  userType: string | null;
  userName: string | null;
  emergencyContacts: SosContact[];
  permissionsGranted: boolean;
  dailyWage: number | null;
}
const DEFAULT_STATE: AppState = { userType: null, userName: null, emergencyContacts: [], permissionsGranted: false, dailyWage: null };
const AppStateCtx = createContext<{ state: AppState; update: (p: Partial<AppState>) => void }>({
  state: DEFAULT_STATE,
  update: () => {},
});
function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    try {
      const s = localStorage.getItem("saathi_appstate");
      return s ? { ...DEFAULT_STATE, ...JSON.parse(s) } : DEFAULT_STATE;
    } catch { return DEFAULT_STATE; }
  });
  const update = (patch: Partial<AppState>) =>
    setState(prev => { const next = { ...prev, ...patch }; try { localStorage.setItem("saathi_appstate", JSON.stringify(next)); } catch {} return next; });
  return <AppStateCtx.Provider value={{ state, update }}>{children}</AppStateCtx.Provider>;
}
const useAppState = () => useContext(AppStateCtx);

const STYLES = `
  @keyframes pulse-ring { 0% { transform:scale(0.85);opacity:0.8 } 100% { transform:scale(2.4);opacity:0 } }
  @keyframes w1 { 0%,100%{height:5px} 50%{height:26px} }
  @keyframes w3 { 0%,100%{height:14px} 50%{height:32px} }
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes spin-slow { to{transform:rotate(360deg)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer { 0%{background-position:-200px 0} 100%{background-position:200px 0} }
  @keyframes gradient-x { 0%,100%{background-size:200% 200%;background-position:left center} 50%{background-size:200% 200%;background-position:right center} }
  .sb::-webkit-scrollbar{display:none} .sb{-ms-overflow-style:none;scrollbar-width:none}
  .wv1{animation:w1 0.85s ease-in-out infinite} .wv3{animation:w3 0.85s ease-in-out infinite 0.24s}
  .pr1{animation:pulse-ring 1.8s ease-out infinite}
  .pr2{animation:pulse-ring 1.8s ease-out infinite 0.6s}
  .float{animation:floatY 3.2s ease-in-out infinite}
  .spin-slow{animation:spin-slow 12s linear infinite}
  .slide-up{animation:slideUp 0.4s ease-out}
  .grad-anim{animation:gradient-x 4s ease infinite}
`;

// ─── VOICE AI SMART FALLBACK ──────────────────────────────────────────────────
function smartReply(msg: string, lang: LangCode): string {
  const m = msg.toLowerCase();
  const isHi = lang === "hi";
  const isTa = lang === "ta";
  const isTe = lang === "te";

  if (m.includes("station") || m.includes("railway") || m.includes("रेलवे") || m.includes("ரயில்") || m.includes("రైల్వే")) {
    if (isHi) return "Railway station ke liye, nearest bus stop se local train lo. Fare sirf ₹5-15 hoga aur 20-30 minute lagenge. Platform ke beech mein khade raho — safe rehoge! 🚉";
    if (isTa) return "ரயில் நிலையத்திற்கு, அருகிலுள்ள பஸ் நிறுத்தத்தில் இருந்து லோக்கல் ட்ரெயின் எடுங்கள். கட்டணம் ₹5-15 மட்டுமே, 20-30 நிமிடங்கள் ஆகும்.";
    if (isTe) return "రైల్వే స్టేషన్ కోసం, సమీపంలోని బస్ స్టాప్ నుండి లోకల్ ట్రెయిన్ తీసుకోండి. చార్జ్ ₹5-15 మాత్రమే, 20-30 నిమిషాలు పడుతుంది.";
    return "For the railway station, take a local bus from the nearest stop. Fare is ₹5-15 and takes 20-30 minutes. Stay in the middle of the platform for safety! 🚉";
  }
  if (m.includes("metro") || m.includes("मेट्रो") || m.includes("மெட்ரோ") || m.includes("మెట్రో")) {
    if (isHi) return "Metro ke liye Journey Guardian screen use karo. Metro fare ₹10-40 hoti hai, AC hoti hai aur bahut safe hai. Rush hour mein ye sabse accha option hai! 🚇";
    if (isTa) return "மெட்ரோவிற்கு Journey Guardian திரையைப் பயன்படுத்துங்கள். மெட்ரோ கட்டணம் ₹10-40, AC மற்றும் மிகவும் பாதுகாப்பானது!";
    return "Use the Journey Guardian screen for metro routes. Metro fare is ₹10-40, air-conditioned and very safe — best option during rush hour! 🚇";
  }
  if (m.includes("bus") || m.includes("बस") || m.includes("பஸ்") || m.includes("బస్")) {
    if (isHi) return "Bus sabse sasta option hai! ₹8-15 mein kaafi door ja sakte ho. App ke routes screen mein bus 312 ya 421 dekhna — ye sabse popular routes hain. 🚌";
    if (isTa) return "பஸ் மிகவும் மலிவான விருப்பம்! ₹8-15-ல் போகலாம். ரூட்ஸ் திரையில் பஸ் 312 அல்லது 421 பாருங்கள்.";
    return "Bus is the cheapest option! Travel for just ₹8-15. Check routes screen for Bus 312 or 421 — most popular routes in the city! 🚌";
  }
  if (m.includes("auto") || m.includes("ola") || m.includes("uber") || m.includes("cab") || m.includes("taxi") || m.includes("ऑटो")) {
    if (isHi) return "Auto ka fair rate ₹15 first km aur ₹8 per km hai. Ola/Uber ₹80-150 lagega. Wage Guardian se check karo — commute cost zyada ho sakti hai! Compare route screen mein karo. 🛺";
    return "Auto fair rate is ₹15 first km + ₹8/km. Ola/Uber costs ₹80-150. Check Wage Guardian — auto can eat 25-30% of your daily income! Use bus+metro for big savings. 🛺";
  }
  if (m.includes("safe") || m.includes("safety") || m.includes("night") || m.includes("सुरक्षित") || m.includes("रात") || m.includes("பாதுகாப்")) {
    if (isHi) return "Current route ka safety score 9.4/10 hai — bahut accha hai! Raat mein well-lit roads lo, Safe Companion activate karo aur kisi se live location share karo. SOS button hamesha ready hai. 🛡️";
    if (isTa) return "தற்போதைய பாதை பாதுகாப்பு மதிப்பெண் 9.4/10. இரவில் நன்கு வெளிச்சமுள்ள சாலைகளை எடுங்கள், Safe Companion செயல்படுத்துங்கள்.";
    return "Current route safety score is 9.4/10 — excellent! At night, take well-lit roads, activate Safe Companion, and share your live location. SOS button is always ready. 🛡️";
  }
  if (m.includes("cheap") || m.includes("save") || m.includes("money") || m.includes("fare") || m.includes("cost") || m.includes("सस्ता") || m.includes("बचत") || m.includes("किराया")) {
    if (isHi) return "Sabse sasta route bus+metro combo hai — sirf ₹22! Auto se ₹160 bachega. Wage Guardian check karo — is month abhi tak ₹4,800 bachaye ja sakte hain! 💰";
    if (isTa) return "மிக மலிவான பாதை பஸ்+மெட்ரோ கலவை — வெறும் ₹22! ஆட்டோவை விட ₹160 சேமிக்கலாம்.";
    return "Cheapest route is bus+metro combo — only ₹22! That saves ₹160 vs auto. Check Wage Guardian — you can save ₹4,800 this month with smart commuting! 💰";
  }
  if (m.includes("time") || m.includes("fast") || m.includes("quick") || m.includes("जल्दी") || m.includes("वक्त") || m.includes("நேரம்")) {
    if (isHi) return "Sabse fast option metro hai — 28 minute mein destination! Bus 32 minute lagega. Aaj traffic ke hisaab se metro best rahega. Journey Guardian mein live ETA dekh sakte ho. ⏱️";
    return "Fastest option is metro — 28 minutes to destination! Bus takes 32 minutes. Given today's traffic, metro is best. Check Journey Guardian for live ETA updates. ⏱️";
  }
  if (m.includes("sos") || m.includes("help") || m.includes("emergency") || m.includes("danger") || m.includes("मदद") || m.includes("आपातकाल")) {
    if (isHi) return "EMERGENCY ke liye abhi SOS button dabao! Police (100), Ambulance (108) call hoga aur live location share hogi. Main tab baat karta hoon jab sab safe ho. 🆘";
    return "For EMERGENCY, press the SOS button RIGHT NOW! It calls Police (100), Ambulance (108) and shares your live location instantly. Stay safe! 🆘";
  }
  if (m.includes("wage") || m.includes("salary") || m.includes("income") || m.includes("तनख्वाह") || m.includes("मजदूरी")) {
    if (isHi) return "Aaj commute pe ₹180 kharch hua — ye daily wage ka 30%! Wage Guardian screen mein daily aur weekly analysis dekho. Bus+Metro se ₹160 bachaa sakte ho! 💰";
    return "Today's commute cost ₹180 — that's 30% of daily wage! Check Wage Guardian screen for daily & weekly analysis. Switch to Bus+Metro and save ₹160 today! 💰";
  }
  if (m.includes("andheri") || m.includes("kurla") || m.includes("dadar") || m.includes("bandra") || m.includes("borivali") || m.includes("thane") || m.includes("pune") || m.includes("delhi")) {
    if (isHi) return `${msg} ke liye best route: Bus 312 → Metro Line 2 combination lo. Total ₹22 aur 32 minute. Cheapest aur safest option hai! Journey Guardian mein start karo. 🗺️`;
    return `For ${msg}: Best route is Bus 312 → Metro Line 2 combination. Total ₹22 and 32 minutes. It's the cheapest and safest option! Start navigation in Journey Guardian. 🗺️`;
  }
  // Default helpful response
  if (isHi) return `"${msg}" ke baare mein — main route, fare, safety aur savings ke baare mein help kar sakta hoon! Journey ke liye sirf poocho jaise: "Andheri kaise jaayein?" ya "Sabse sasta route batao" 🤖`;
  if (isTa) return `"${msg}" பற்றி — நான் பாதை, கட்டணம், பாதுகாப்பு மற்றும் சேமிப்பு பற்றி உதவ முடியும்! "அந்தேரி எப்படி செல்வது?" என்று கேளுங்கள் 🤖`;
  return `About "${msg}" — I can help with routes, fares, safety & savings! Try asking: "How to reach Andheri?" or "Cheapest route to station?" or "Is my route safe at night?" 🤖`;
}

// ─── ALARM SOUND (Web Audio API) ─────────────────────────────────────────────
function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRefs = useRef<OscillatorNode[]>([]);

  const start = () => {
    try {
      ctxRef.current?.close().catch(() => {});
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctxRef.current = ctx;
      const now = ctx.currentTime;
      // Siren: 8 repeating sweeps
      for (let i = 0; i < 12; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        const t = now + i * 0.7;
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.linearRampToValueAtTime(1100, t + 0.35);
        osc.frequency.linearRampToValueAtTime(520, t + 0.7);
        gain.gain.setValueAtTime(0.55, t);
        gain.gain.setValueAtTime(0.55, t + 0.65);
        gain.gain.linearRampToValueAtTime(0, t + 0.7);
        osc.start(t);
        osc.stop(t + 0.7);
        oscRefs.current.push(osc);
      }
    } catch {}
  };

  const stop = () => {
    try { ctxRef.current?.close(); ctxRef.current = null; oscRefs.current = []; } catch {}
  };

  return { start, stop };
}

// ─── NEARBY EMERGENCY SERVICES (Overpass API) ─────────────────────────────────
interface NearbyPlace {
  id: number; lat: number; lon: number;
  name: string; type: "police" | "hospital" | "ambulance";
  distanceM: number; phone?: string;
}

async function fetchNearbyServices(lat: number, lng: number): Promise<NearbyPlace[]> {
  const query = `[out:json][timeout:8];(
    node["amenity"="police"](around:4000,${lat},${lng});
    way["amenity"="police"](around:4000,${lat},${lng});
    node["amenity"="hospital"](around:4000,${lat},${lng});
    way["amenity"="hospital"](around:4000,${lat},${lng});
    node["amenity"="clinic"](around:4000,${lat},${lng});
  );out center body;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST", body: query,
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error("overpass failed");
  const data = await res.json();
  const R = 6371000;
  return (data.elements ?? []).map((el: any) => {
    const eLat = el.lat ?? el.center?.lat ?? lat;
    const eLon = el.lon ?? el.center?.lon ?? lng;
    const dLat = (eLat - lat) * Math.PI / 180;
    const dLon = (eLon - lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(eLat*Math.PI/180)*Math.sin(dLon/2)**2;
    const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    const type: NearbyPlace["type"] = el.tags?.amenity === "police" ? "police" : "hospital";
    return {
      id: el.id, lat: eLat, lon: eLon,
      name: el.tags?.name || el.tags?.["name:en"] || (type === "police" ? "Police Station" : "Hospital"),
      type, distanceM: dist,
      phone: el.tags?.phone || el.tags?.["contact:phone"],
    };
  }).filter((p: NearbyPlace) => p.distanceM < 4000)
    .sort((a: NearbyPlace, b: NearbyPlace) => a.distanceM - b.distanceM)
    .slice(0, 5);
}

const WAGE_DATA = [
  { day:"Mon", wage:600, commute:180 }, { day:"Tue", wage:600, commute:140 },
  { day:"Wed", wage:600, commute:160 }, { day:"Thu", wage:600, commute:120 },
  { day:"Fri", wage:600, commute:180 }, { day:"Sat", wage:400, commute:80 },
];

type NavFnT = (s: Screen) => void;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function StatusBar({ light = false }: { light?: boolean }) {
  const c = light ? "text-white/90" : "text-slate-700";
  return (
    <div className={`absolute top-0 left-0 right-0 z-40 flex justify-between items-center px-7 pt-4 pb-1 pointer-events-none ${c}`}>
      <span className="text-[11px] font-bold" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>9:41</span>
      <div className="flex items-center gap-1 opacity-80"><Signal size={10} /><Wifi size={10} /><Battery size={10} /></div>
    </div>
  );
}
function BackHeader({ title, sub, navigate, to }: { title: string; sub: string; navigate: NavFnT; to: Screen }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={() => navigate(to)} className="w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
        <ArrowLeft size={17} className="text-slate-600" />
      </button>
      <div>
        <p className="text-slate-400 text-xs">{sub}</p>
        <h2 className="text-lg font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h2>
      </div>
    </div>
  );
}
function AICard({ icon, title, body, color="blue" }: { icon: React.ReactNode; title: string; body: string; color?: string }) {
  const map: Record<string, string[]> = {
    blue: ["bg-blue-50 border-blue-100","text-blue-800","text-blue-600"],
    amber: ["bg-amber-50 border-amber-100","text-amber-800","text-amber-700"],
    emerald: ["bg-emerald-50 border-emerald-100","text-emerald-800","text-emerald-700"],
    violet: ["bg-violet-50 border-violet-100","text-violet-800","text-violet-700"],
  };
  const [bg, txt, sub] = map[color] ?? map.blue;
  return (
    <div className={`${bg} border rounded-3xl p-4 flex gap-3`}>
      <div className="flex-shrink-0">{icon}</div>
      <div><p className={`font-black text-sm ${txt}`}>{title}</p><p className={`text-xs mt-0.5 leading-relaxed ${sub}`}>{body}</p></div>
    </div>
  );
}
function BottomNav({ active, navigate }: { active: Screen; navigate: NavFnT }) {
  const items: { id: Screen; icon: React.ElementType; label: string; danger?: boolean }[] = [
    { id:"home",    icon:Home,         label:"Home" },
    { id:"routes",  icon:Navigation,   label:"Routes" },
    { id:"safety",  icon:Shield,       label:"Safety" },
    { id:"sos",     icon:AlertTriangle,label:"SOS", danger:true },
    { id:"profile", icon:User,         label:"Profile" },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur-xl border-t border-slate-100 pb-5 pt-2 px-2">
      <div className="flex justify-around">
        {items.map(({ id, icon:Icon, label, danger }) => {
          const isActive = active === id || (id === "routes" && (active==="routeDetail"));
          return (
            <button key={id} onClick={() => navigate(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all active:scale-90 ${
                isActive
                  ? danger ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"
                  : danger ? "text-red-400/70" : "text-slate-400"
              }`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCREEN 1: SPLASH ─────────────────────────────────────────────────────────
function SplashScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  useEffect(() => {
    const t = setTimeout(() => navigate("language"), 2800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-700 via-blue-600 to-indigo-800 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full spin-slow" />
      <div className="absolute bottom-0 -left-20 w-60 h-60 bg-white/5 rounded-full" />
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }}
        className="flex flex-col items-center gap-5">
        <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl float">
          <Navigation size={44} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-4xl tracking-tight" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>CommuteSaathi</h1>
          <p className="text-blue-200 text-sm mt-1">{t.subtitle.split(" ").slice(0,5).join(" ")}…</p>
        </div>
        <div className="flex gap-2 mt-2">
          {["🇮🇳 Hindi","தமிழ்","తెలుగు","English"].map(l => (
            <div key={l} className="bg-white/15 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">{l}</div>
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-16 flex flex-col items-center gap-3">
        <div className="flex gap-1">
          {[0, 0.2, 0.4].map((d, i) => <div key={i} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay:`${d}s` }} />)}
        </div>
        <p className="text-blue-200/60 text-[11px]">AI Mobility Companion for Bharat</p>
      </motion.div>
    </div>
  );
}

// ─── SCREEN 2: LANGUAGE ───────────────────────────────────────────────────────
function LanguageScreen({ navigate }: { navigate: NavFnT }) {
  const { t, lang, setLang } = useLang();
  const langs: { flag: string; name: string; native: string; code: LangCode; speakers: string }[] = [
    { flag: "🇮🇳", name: "Hindi", native: "हिंदी", code: "hi", speakers: "500M+ speakers" },
    { flag: "🇮🇳", name: "Tamil", native: "தமிழ்", code: "ta", speakers: "80M+ speakers" },
    { flag: "🇮🇳", name: "Telugu", native: "తెలుగు", code: "te", speakers: "95M+ speakers" },
    { flag: "🇮🇳", name: "English", native: "English", code: "en", speakers: "Universal" },
  ];
  return (
    <div className="min-h-full bg-background px-5 pt-20 pb-10">
      <StatusBar />
      <div className="flex items-center gap-2 mb-2"><Globe size={20} className="text-blue-600" /><span className="text-blue-600 text-xs font-black uppercase tracking-widest">Multilingual Support</span></div>
      <h1 className="text-2xl font-black text-slate-800 mb-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.chooseLanguage}</h1>
      <p className="text-slate-400 text-sm mb-8">{t.langSubtitle}</p>
      <div className="space-y-3 mb-6">
        {langs.map(({ flag, name, native, code, speakers }) => (
          <button key={code} onClick={() => setLang(code)}
            className={`w-full border rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-95 transition-all text-left ${lang===code?"bg-blue-50 border-blue-400 shadow-blue-100":"bg-white border-slate-100"}`}>
            <span className="text-5xl">{flag}</span>
            <div className="flex-1">
              <div className="text-xl font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{native}</div>
              <div className="text-xs text-slate-400 mt-0.5">{name} · {speakers}</div>
            </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${lang===code?"bg-blue-600":"bg-blue-50"}`}>
              {lang===code ? <CheckCircle size={16} className="text-white" /> : <Volume2 size={16} className="text-blue-600" />}
            </div>
          </button>
        ))}
      </div>
      <button onClick={() => navigate("auth")} disabled={!lang}
        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl text-base shadow-xl active:scale-95 transition-all">
        {t.continue}
      </button>
    </div>
  );
}

// ─── SCREEN 3: AUTH ───────────────────────────────────────────────────────────
function AuthScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { update } = useAppState();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState<"google"|"phone"|null>(null);
  const [otpPending, setOtpPending] = useState<any>(null);

  const handleGoogle = async () => {
    setLoading("google");
    try {
      const user = await signInWithGoogle();
      update({ userName: user.displayName || user.email || "Commuter" });
      navigate("userType");
    } catch (e: any) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
        toast.error("Popup blocked — please allow popups or use Phone/Guest login");
      } else {
        toast.error("Google sign-in failed. Try Phone or Guest.");
      }
    } finally { setLoading(null); }
  };

  const handlePhone = async () => {
    const num = phone.trim();
    if (!num.match(/^\+\d{10,13}$/)) { toast.error("Enter valid E.164 number e.g. +919876543210"); return; }
    setLoading("phone");
    try {
      const cr = await startPhoneSignIn(num);
      setOtpPending({ cr, phone: num });
    } catch {
      toast.info("Demo mode — proceeding as guest");
      update({ userName: "Commuter" });
      navigate("userType");
    } finally { setLoading(null); }
  };

  if (otpPending) return <OTPScreen confirmation={otpPending} navigate={navigate} />;

  return (
    <div className="min-h-full bg-background px-6 pt-20 pb-10">
      <StatusBar />
      <div id="recaptcha-container" className="invisible absolute" />
      <div className="mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mb-4 shadow-lg">
          <Navigation size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.signIn}</h1>
        <p className="text-slate-400 text-sm mt-1">CommuteSaathi — AI Mobility Companion</p>
      </div>

      <div className="space-y-3 mb-6">
        <button onClick={handleGoogle} disabled={loading==="google"}
          className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-slate-700 active:scale-95 transition-all shadow-sm disabled:opacity-60">
          {loading==="google" ? <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" /> : <span className="text-xl">G</span>}
          {t.signInWith} {t.google}
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-slate-400 text-xs mb-2">{t.enterPhone}</p>
          <div className="flex gap-2">
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder={t.phonePlaceholder}
              className="flex-1 bg-transparent text-sm text-slate-800 outline-none font-semibold" />
            <button onClick={handlePhone} disabled={!phone||loading==="phone"}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black disabled:opacity-40 active:scale-95 transition-transform">
              {loading==="phone" ? "…" : t.sendOTP}
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-slate-400 text-xs">OR</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <button onClick={() => { update({ userName: "Guest" }); navigate("userType"); }}
        className="w-full bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 rounded-2xl py-4 flex items-center justify-center gap-2 font-black text-slate-700 active:scale-95 transition-all shadow-sm">
        <User size={18} className="text-slate-500" />{t.guestMode}
        <span className="text-slate-400 text-xs font-normal ml-1">({t.guestDesc})</span>
      </button>

      <p className="text-center text-slate-300 text-xs mt-5">Secure · Private · No spam</p>
    </div>
  );
}

function OTPScreen({ confirmation, navigate }: { confirmation: { cr: any; phone: string }; navigate: NavFnT }) {
  const { t } = useLang();
  const { update } = useAppState();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (code.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setLoading(true);
    try {
      const user = await confirmOtp(confirmation.cr, code);
      update({ userName: user.phoneNumber || "Commuter" });
      navigate("userType");
    } catch { toast.error("Invalid OTP. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-full bg-background px-6 pt-24 pb-10">
      <StatusBar />
      <div className="mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mb-4 shadow-lg">
          <Lock size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.enterOTP}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.otpSent} {confirmation.phone}</p>
      </div>
      <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
        placeholder="— — — — — —" type="tel" maxLength={6}
        className="w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-2xl font-black text-center tracking-[0.4em] text-slate-800 outline-none focus:border-blue-400 mb-5" />
      <button onClick={verify} disabled={code.length!==6||loading}
        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-40">
        {loading ? "Verifying…" : t.verify}
      </button>
    </div>
  );
}

// ─── SCREEN 4: USER TYPE ──────────────────────────────────────────────────────
function UserTypeScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { state, update } = useAppState();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(state.userType);

  const handleContinue = async () => {
    if (!selected) return;
    update({ userType: selected });
    if (user) {
      const typeKey = t.userTypes[t.userTypes.indexOf(selected as string)];
      await upsertUserProfile(user.uid, { userType: typeKey }).catch(() => {});
    }
    navigate("permissions");
  };

  return (
    <div className="min-h-full bg-background px-5 pt-16 pb-10">
      <StatusBar />
      <div className="mb-6">
        <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-1">Smart Profiling</p>
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.whoAreYou}</h1>
        <p className="text-slate-400 text-sm mt-1">AI will personalize routes based on your profile</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {t.userTypes.map((type, i) => (
          <button key={type} onClick={() => setSelected(type)}
            className={`rounded-3xl p-4 border flex flex-col items-start gap-2 text-left active:scale-95 transition-all ${selected===type?"bg-blue-600 border-blue-600 shadow-xl shadow-blue-200":"bg-white border-slate-100 shadow-sm"}`}>
            <span className="text-3xl leading-none">{t.userTypeIcons[i]}</span>
            <div>
              <div className={`font-black text-sm ${selected===type?"text-white":"text-slate-800"}`}>{type}</div>
              <div className={`text-[10px] mt-0.5 ${selected===type?"text-blue-200":"text-slate-400"}`}>{t.userTypeDescs[i]}</div>
            </div>
          </button>
        ))}
      </div>
      <button onClick={handleContinue} disabled={!selected}
        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-40">
        {t.continue}
      </button>
    </div>
  );
}

// ─── SCREEN 5: PERMISSIONS ────────────────────────────────────────────────────
function PermissionsScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { update } = useAppState();
  const [granted, setGranted] = useState<boolean[]>([false, false, false, false]);
  const icons = [MapPin, Mic, Bell, Activity];
  const colors = ["text-blue-600", "text-violet-600", "text-amber-500", "text-emerald-600"];
  const bgs = ["bg-blue-50", "bg-violet-50", "bg-amber-50", "bg-emerald-50"];

  const requestAll = async () => {
    const results = [false, false, false, false];
    try {
      const loc = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (loc.state !== "denied") { navigator.geolocation.getCurrentPosition(() => {}); results[0] = true; }
    } catch { results[0] = true; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      results[1] = true;
    } catch {}
    if ("Notification" in window) {
      try { const r = await Notification.requestPermission(); results[2] = r === "granted"; } catch {}
    } else { results[2] = true; }
    results[3] = results[0];
    setGranted(results);
    update({ permissionsGranted: true });
    setTimeout(() => navigate("emergencySetup"), 700);
  };

  return (
    <div className="min-h-full bg-background px-5 pt-16 pb-10">
      <StatusBar />
      <div className="mb-6">
        <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-1">Setup</p>
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.permissionsTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.permissionsSubtitle}</p>
      </div>
      <div className="space-y-3 mb-8">
        {t.permissions.map((perm, i) => {
          const Icon = icons[i];
          return (
            <div key={perm} className={`bg-white border rounded-3xl p-4 flex items-center gap-4 shadow-sm border-slate-100 ${granted[i]?"border-l-4 border-l-emerald-400":""}`}>
              <div className={`w-11 h-11 ${bgs[i]} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={colors[i]} />
              </div>
              <div className="flex-1">
                <div className="font-black text-slate-800 text-sm">{perm}</div>
                <div className="text-slate-400 text-xs mt-0.5">{t.permissionsDesc[i]}</div>
              </div>
              {granted[i] ? <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" /> : <div className="w-5 h-5 border-2 border-slate-200 rounded-full flex-shrink-0" />}
            </div>
          );
        })}
      </div>
      <button onClick={requestAll} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform mb-3">
        {t.allowAll}
      </button>
      <button onClick={() => { update({ permissionsGranted: true }); navigate("emergencySetup"); }}
        className="w-full text-slate-400 text-sm py-2">{t.skipForNow}</button>
    </div>
  );
}

// ─── SCREEN 6: EMERGENCY CONTACT SETUP ───────────────────────────────────────
function EmergencySetupScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { state, update } = useAppState();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<SosContact[]>(state.emergencyContacts);
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const [showForm, setShowForm] = useState(false);

  const addContact = async () => {
    if (!form.name || !form.phone) { toast.error("Name and phone required"); return; }
    const c: SosContact = { name: form.name, phone: form.phone, relation: form.relation };
    const next = [...contacts, c];
    setContacts(next);
    update({ emergencyContacts: next });
    if (user) SosContacts.add(user.uid, c).catch(() => {});
    setForm({ name: "", phone: "", relation: "" });
    setShowForm(false);
    toast.success(`${c.name} added as emergency contact`);
  };

  return (
    <div className="min-h-full bg-background px-5 pt-16 pb-10">
      <StatusBar />
      <div className="mb-6">
        <p className="text-red-500 text-xs font-black uppercase tracking-widest mb-1">🆘 Emergency Setup</p>
        <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.emergencyTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.emergencySubtitle}</p>
      </div>

      <div className="space-y-3 mb-4">
        {contacts.map((c, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0"><User size={16} className="text-emerald-600" /></div>
            <div className="flex-1"><div className="font-black text-slate-800 text-sm">{c.name}</div><div className="text-slate-400 text-xs">{c.phone} {c.relation && `· ${c.relation}`}</div></div>
            <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 mb-4 space-y-3 shadow-sm">
          <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder={t.nameLabel}
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-400" />
          <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder={t.phonePlaceholder} type="tel"
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-400" />
          <input value={form.relation} onChange={e=>setForm(f=>({...f,relation:e.target.value}))} placeholder={t.relationLabel}
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-400" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black text-sm">{t.skip}</button>
            <button onClick={addContact} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-sm active:scale-95">{t.save}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full bg-white border-2 border-dashed border-blue-200 rounded-3xl py-4 text-blue-600 font-black mb-4 active:scale-95 transition-transform">
          {t.addContact}
        </button>
      )}

      <button onClick={() => navigate("aiPersonalization")}
        className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-transform">
        {contacts.length > 0 ? t.continue : t.skipForNow}
      </button>
    </div>
  );
}

// ─── SCREEN 7: AI PERSONALIZATION ─────────────────────────────────────────────
function AIPersonalizationScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { state } = useAppState();
  const [step, setStep] = useState(0);
  const steps = [
    { icon:"🧠", label:"Analyzing your profile…" },
    { icon:"📍", label:"Mapping local routes…" },
    { icon:"💰", label:"Calculating wage impact…" },
    { icon:"🛡️", label:"Loading safety data…" },
    { icon:"✅", label:"Saathi is ready!" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => {
        if (s >= steps.length - 1) { clearInterval(interval); setTimeout(() => navigate("home"), 800); return s; }
        return s + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-700 to-indigo-900 flex flex-col items-center justify-center px-8 relative overflow-hidden">
      <div className="absolute inset-0"><div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full spin-slow" /></div>
      <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center z-10">
        <div className="text-7xl mb-5 float">{steps[step].icon}</div>
        <h2 className="text-white font-black text-xl mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{t.aiTitle}</h2>
        <p className="text-blue-200 text-sm mb-2">{steps[step].label}</p>
        {state.userType && <div className="bg-white/15 rounded-2xl px-4 py-2 inline-block"><span className="text-white text-xs font-semibold">Profile: {state.userType}</span></div>}
      </motion.div>
      <div className="absolute bottom-16 flex gap-2 z-10">
        {steps.map((_, i) => (
          <div key={i} className={`rounded-full transition-all ${i<=step?"w-5 h-2 bg-white":"w-2 h-2 bg-white/30"}`} />
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN 8: HOME DASHBOARD ─────────────────────────────────────────────────
function HomeScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { state } = useAppState();
  const store = useCommuteStore();
  const geo = useGeolocation();
  const [searchDest, setSearchDest] = useState("");

  // Request GPS on mount for live location card
  useEffect(() => { geo.request(); }, []);
  useEffect(() => { if (geo.coords) store.setOriginCoords(geo.coords); }, [geo.coords]);

  const personaMap: Record<string, { color: string; priority: string }> = {
    [t.userTypes[0]]: { color: "from-emerald-600 to-teal-700",  priority: "Cost Savings" },
    [t.userTypes[1]]: { color: "from-blue-600 to-indigo-700",   priority: "Safety & Cost" },
    [t.userTypes[2]]: { color: "from-orange-500 to-amber-600",  priority: "Speed First" },
    [t.userTypes[3]]: { color: "from-purple-600 to-pink-600",   priority: "Safety First" },
    [t.userTypes[4]]: { color: "from-blue-600 to-cyan-700",     priority: "Comfort" },
    [t.userTypes[5]]: { color: "from-teal-600 to-emerald-700",  priority: "Accessibility" },
  };
  const persona = state.userType
    ? (personaMap[state.userType] ?? { color:"from-blue-600 to-indigo-700", priority:"Balanced" })
    : { color:"from-blue-600 to-indigo-700", priority:"" };
  const userIcon = state.userType ? t.userTypeIcons[t.userTypes.indexOf(state.userType as any)] : "👤";

  const features = [
    { id:"voice"        as Screen, emoji:"🎙️", label:t.features[0], desc:t.featureDescs[0], grad:"from-blue-600 to-indigo-700",   badge:t.voiceAIBadge },
    { id:"wageGuardian" as Screen, emoji:"💰", label:t.features[1], desc:t.featureDescs[1], grad:"from-emerald-600 to-teal-700",  badge:t.wageGuardianBadge },
    { id:"safety"       as Screen, emoji:"🛡️", label:t.features[2], desc:t.featureDescs[2], grad:"from-violet-600 to-purple-700", badge:t.safetyBadge },
    { id:"routes"       as Screen, emoji:"🗺️", label:t.features[3], desc:t.featureDescs[3], grad:"from-amber-500 to-orange-600",  badge:t.journeyBadge },
    { id:"sos"          as Screen, emoji:"🆘", label:t.features[4], desc:t.featureDescs[4], grad:"from-red-600 to-rose-700",      badge:t.sosBadge },
    { id:"profile"      as Screen, emoji:"👤", label:"My Profile",  desc:"Type · Language · Contacts", grad:"from-pink-500 to-pink-700", badge:"Settings" },
  ];

  const { address: gpsAddress, loading: gpsResolving } = useAddressFromCoords(geo.coords ?? null);
  const gpsLabel = geo.status === "granted" && geo.coords
    ? (gpsResolving ? "Identifying location…" : (gpsAddress ?? `${geo.coords.lat.toFixed(4)}, ${geo.coords.lng.toFixed(4)}`))
    : geo.status === "pending" ? "Getting location…" : "Enable GPS";
  const gpsLive = geo.status === "granted" && !!geo.coords;

  return (
    <div className="bg-background pb-24 px-5 pt-14">
      <StatusBar />

      {/* Header row */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-slate-400 text-xs">{t.greeting(state.userName || undefined)}</p>
          <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily:"Plus Jakarta Sans, sans-serif" }}>
            CommuteSaathi
          </h2>
        </div>
        <button onClick={() => navigate("profile")}
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${persona.color} flex items-center justify-center shadow-md text-2xl active:scale-90 transition-transform`}>
          {userIcon}
        </button>
      </div>

      {/* Live GPS location strip */}
      <button onClick={() => !gpsLive && geo.request()}
        className={`w-full rounded-2xl px-4 py-2.5 mb-4 flex items-center gap-3 border transition-all ${
          gpsLive
            ? "bg-emerald-50 border-emerald-200"
            : geo.status === "pending"
              ? "bg-amber-50 border-amber-200"
              : "bg-slate-50 border-slate-200"
        }`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${gpsLive?"bg-emerald-500":geo.status==="pending"?"bg-amber-400":"bg-slate-300"}`}>
          <MapPin size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-xs font-black ${gpsLive?"text-emerald-700":geo.status==="pending"?"text-amber-700":"text-slate-500"}`}>
            {gpsLive ? "📍 Live Location Active" : geo.status==="pending" ? "⏳ Detecting location…" : "📍 Tap to enable GPS"}
          </p>
          <p className={`text-[11px] truncate ${gpsLive?"text-emerald-600":"text-slate-400"}`}>{gpsLabel}</p>
        </div>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gpsLive?"bg-emerald-500 animate-pulse":"bg-slate-300"}`} />
      </button>

      {/* AI mode pill */}
      {state.userType && (
        <div className={`bg-gradient-to-r ${persona.color} rounded-2xl px-4 py-2 mb-4 flex items-center gap-2`}>
          <Sparkles size={13} className="text-white/80" />
          <span className="text-white text-xs font-semibold">AI Mode: {persona.priority} · {state.userType}</span>
        </div>
      )}

      {/* Search / route hero */}
      <div className={`bg-gradient-to-br ${persona.color} rounded-[28px] p-5 mb-5 shadow-2xl relative overflow-hidden`}>
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-medium mb-1">
            {gpsLive ? `📍 ${gpsAddress ?? `${geo.coords!.lat.toFixed(4)}, ${geo.coords!.lng.toFixed(4)}`}` : "AI-Powered · Voice First"}
          </p>
          <h3 className="text-white text-xl font-black mb-3" style={{ fontFamily:"Plus Jakarta Sans, sans-serif" }}>
            {t.whereToGo}
          </h3>
          <form onSubmit={e => { e.preventDefault(); if (searchDest.trim()) { store.setDestination(searchDest.trim()); navigate("routes"); }}}
            className="flex gap-2">
            <button type="button" onClick={() => navigate("voice")}
              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl active:scale-90 transition-transform flex-shrink-0">
              <Mic size={24} className="text-blue-600" />
            </button>
            <div className="flex-1 flex bg-white/15 border border-white/25 rounded-2xl overflow-hidden">
              <input value={searchDest} onChange={e => setSearchDest(e.target.value)}
                placeholder="e.g. Andheri Station…"
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none" />
              <button type="submit" disabled={!searchDest.trim()}
                className="w-12 flex items-center justify-center bg-white/20 active:bg-white/30 transition-colors disabled:opacity-30">
                <ChevronRight size={18} className="text-white" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Features grid */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-black text-slate-700">Features</h3>
          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">6 Core</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {features.map(({ id, emoji, label, desc, grad, badge }) => (
            <button key={id} onClick={() => navigate(id)}
              className={`bg-gradient-to-br ${grad} rounded-3xl p-4 flex flex-col gap-2 shadow-lg active:scale-95 transition-transform text-left`}>
              <div className="flex items-start justify-between">
                <span className="text-3xl leading-none">{emoji}</span>
                <span className="text-[9px] bg-white/25 text-white px-2 py-0.5 rounded-full font-black">{badge}</span>
              </div>
              <div>
                <div className="text-white font-black text-[11px] leading-tight">{label}</div>
                <div className="text-white/70 text-[9px] mt-0.5 leading-snug">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 9: VOICE AI ───────────────────────────────────────────────────────
type ChatMsg = { role: "user"|"assistant"; content: string };
function VoiceScreen({ navigate }: { navigate: NavFnT }) {
  const ask = useServerFn(askSaathi);
  const { t, lang } = useLang();
  const langMap: Record<LangCode, string> = { hi:"hi-IN", ta:"ta-IN", te:"te-IN", en:"en-IN" };
  const { supported, listening, transcript, speaking, startListening, stopListening, speak, stopSpeaking } = useSpeech({ lang: langMap[lang] });
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState("");
  const [aiMode, setAiMode] = useState<"live"|"smart"|"error">("live");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const phase = listening?"listening":thinking?"processing":speaking?"speaking":"idle";

  useEffect(() => { scrollRef.current?.scrollTo({ top:scrollRef.current.scrollHeight, behavior:"smooth" }); }, [messages, thinking]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    setMessages(m => [...m, { role:"user", content:clean }]);
    setTyped("");
    setThinking(true);
    try {
      const res = await ask({
        data: {
          message: clean,
          history: messages.slice(-8),
          language: lang==="hi"?"Hindi":lang==="ta"?"Tamil":lang==="te"?"Telugu":"English",
        },
      });
      if (res.reply && res.reply.length > 0) {
        setAiMode("live");
        setMessages(m => [...m, { role:"assistant", content:res.reply }]);
        speak(res.reply);
      } else {
        // API not configured or quota — use smart local fallback
        setAiMode("smart");
        const fallback = smartReply(clean, lang);
        setMessages(m => [...m, { role:"assistant", content:fallback }]);
        speak(fallback);
      }
    } catch {
      setAiMode("smart");
      const fallback = smartReply(clean, lang);
      setMessages(m => [...m, { role:"assistant", content:fallback }]);
      speak(fallback);
    } finally {
      setThinking(false);
    }
  }

  const modeBadge = aiMode === "live"
    ? { label:"🟢 Groq AI Live", cls:"bg-emerald-500/20 text-emerald-300 border-emerald-500/30" }
    : { label:"🔵 Smart AI Mode", cls:"bg-blue-500/20 text-blue-300 border-blue-500/30" };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 flex flex-col px-5 pt-14 pb-6 relative overflow-hidden">
      <div className="absolute inset-0 flex items-start justify-center pointer-events-none">
        <div className="w-80 h-80 bg-blue-600/10 rounded-full blur-3xl mt-16" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between z-10 mb-2">
        <button onClick={()=>navigate("home")} className="w-10 h-10 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center">
          <X size={18} className="text-white" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-white text-sm font-black">🎙️ Voice AI Route Engine</span>
          </div>
          <div className={`mt-0.5 border rounded-full px-2.5 py-0.5 text-[9px] font-black inline-block ${modeBadge.cls}`}>{modeBadge.label}</div>
        </div>
        <button onClick={()=>navigate("routes")} className="bg-blue-600/40 border border-blue-500/30 text-blue-200 text-[11px] font-bold px-3 py-1.5 rounded-xl">
          Routes →
        </button>
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto z-10 py-3 space-y-3 min-h-0 sb">
        {messages.length === 0 && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="text-center pt-4">
            <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-3 float">
              <Mic size={32} className="text-blue-300" />
            </div>
            <p className="text-white text-xl font-black leading-snug" style={{fontFamily:"Plus Jakarta Sans, sans-serif"}}>{t.voiceGreet}</p>
            <p className="text-blue-200/70 text-sm mt-1.5 mb-5">{t.voiceHint}</p>
            <div className="flex flex-col gap-2">
              {t.suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left text-sm text-blue-100 bg-white/6 border border-white/10 rounded-2xl px-4 py-3 active:scale-[0.98] transition-transform hover:bg-white/10 flex items-center gap-2">
                  <span className="text-blue-400 text-base">→</span>{s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
            className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <span className="text-xs">🤖</span>
              </div>
            )}
            <div className={`max-w-[78%] text-sm leading-relaxed px-4 py-3 rounded-2xl ${
              m.role==="user"
                ? "bg-blue-600 text-white rounded-br-sm shadow-lg"
                : "bg-white/10 text-blue-50 rounded-bl-sm border border-white/10 shadow-sm"
            }`}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {thinking && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><span className="text-xs">🤖</span></div>
            <div className="bg-white/10 border border-white/10 rounded-2xl rounded-bl-sm px-5 py-3.5 flex items-center gap-1.5">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-2 h-2 bg-blue-300 rounded-full animate-bounce" style={{animationDelay:`${d}s`}} />
              ))}
            </div>
          </div>
        )}
        {listening && transcript && (
          <div className="flex justify-end">
            <div className="max-w-[78%] text-sm px-4 py-3 rounded-2xl bg-blue-600/40 text-white rounded-br-sm border border-blue-500/30 italic">
              {transcript}…
            </div>
          </div>
        )}
      </div>

      {/* Mic button */}
      <div className="relative flex items-center justify-center my-3 h-32 z-10">
        {listening && (
          <>
            <div className="absolute w-32 h-32 bg-blue-500/20 rounded-full pr1" />
            <div className="absolute w-32 h-32 bg-blue-400/12 rounded-full pr2" />
          </>
        )}
        {speaking && (
          <div className="absolute flex items-end gap-1 bottom-1">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`w-1 bg-emerald-400 rounded-full wv${i%5+1}`} style={{minHeight:"5px"}} />
            ))}
          </div>
        )}
        <motion.button
          onClick={() => { if (speaking) stopSpeaking(); else if (listening) stopListening(); else startListening(send); }}
          whileTap={{ scale: 0.88 }}
          animate={phase==="processing" ? {scale:[1,1.05,1]} : {scale:1}}
          transition={{repeat:Infinity, duration:0.85}}
          className={`relative w-[88px] h-[88px] rounded-full flex items-center justify-center shadow-2xl transition-all ${
            listening ? "bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/40"
            : speaking ? "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/40"
            : "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/40"
          }`}>
          {speaking
            ? <div className="w-7 h-7 bg-white rounded-lg" />
            : <Mic size={34} className="text-white" strokeWidth={2} />
          }
        </motion.button>
      </div>

      {/* Status */}
      <div className="text-center h-5 z-10 mb-2">
        {phase==="listening" && <span className="text-red-300 text-sm font-semibold">● {t.listening}</span>}
        {phase==="processing" && <span className="text-amber-300 text-sm font-semibold">⏳ {t.processing}</span>}
        {phase==="speaking" && <span className="text-emerald-300 text-sm font-semibold">🔊 {t.speaking}</span>}
        {phase==="idle" && !supported && <span className="text-blue-300/60 text-xs">Voice not supported — type below</span>}
        {phase==="idle" && supported && <span className="text-blue-300/60 text-xs">{t.voiceTip}</span>}
      </div>

      {/* Type input */}
      <form onSubmit={e=>{e.preventDefault();send(typed);}} className="flex items-center gap-2 z-10">
        <input value={typed} onChange={e=>setTyped(e.target.value)}
          placeholder={lang==="hi"?"अपना सवाल टाइप करें…":lang==="ta"?"உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்…":lang==="te"?"మీ ప్రశ్న టైప్ చేయండి…":"Type your question…"}
          className="flex-1 bg-white/8 border border-white/12 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-blue-200/40 outline-none focus:border-blue-400/60 focus:bg-white/12" />
        <button type="submit" disabled={!typed.trim()||thinking}
          className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform shadow-lg">
          <Send size={18} className="text-white" />
        </button>
      </form>
    </div>
  );
}

// ─── SCREEN 10: JOURNEY GUARDIAN (Routes) ─────────────────────────────────────
function RoutesScreen({ navigate }: { navigate: NavFnT }) {
  const store = useCommuteStore();
  const suggest = useServerFn(suggestRoutes);
  const geo = useGeolocation();
  const [searchQuery, setSearchQuery] = useState(store.destination);
  const [activeFilter, setActiveFilter] = useState<"all"|"cheap"|"fast"|"safe">("all");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai"|"fallback"|null>(null);
  const [notice, setNotice] = useState<string|null>(null);

  const { address: originAddress } = useAddressFromCoords(store.originCoords ?? null);

  const plan = async (dest: string) => {
    const destination = dest.trim(); if (!destination) return;
    setLoading(true); setNotice(null); store.setDestination(destination);
    try {
      const [destCoords, res] = await Promise.all([
        geocodePlace(destination),
        suggest({ data:{
          destination,
          origin: originAddress ?? (store.originCoords ? `${store.originCoords.lat.toFixed(4)}, ${store.originCoords.lng.toFixed(4)}` : "current location"),
          profile: "daily commuter in India",
          ...(store.originCoords ? { originLat: store.originCoords.lat, originLng: store.originCoords.lng } : {}),
        } }),
      ]);
      store.setDestinationCoords(destCoords); store.setRoutes(res.routes as any); setSource(res.source);
      if (res.error) setNotice(res.error);
    } catch {
      store.setRoutes(fallbackRoutes(destination) as any); setSource("fallback"); setNotice("Showing saved routes.");
    } finally { setLoading(false); }
  };

  useEffect(() => { geo.request(); if (store.routes.length===0 && store.destination.trim()) plan(store.destination); }, []);
  useEffect(() => { if (geo.coords) store.setOriginCoords(geo.coords); }, [geo.coords]);

  const filtered = [...store.routes].sort((a,b)=>{
    const n=(s:string)=>parseFloat(s.replace(/[^\d.]/g,""))||0;
    if (activeFilter==="cheap") return n(a.fare)-n(b.fare);
    if (activeFilter==="fast") return n(a.time)-n(b.time);
    if (activeFilter==="safe") return n(b.safety)-n(a.safety);
    return 0;
  });

  return (
    <div className="bg-background pb-24 px-5 pt-14">
      <StatusBar />
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5"><span className="text-lg">🗺️</span><p className="text-slate-400 text-xs">Journey Guardian</p></div>
          <h2 className="text-xl font-black truncate" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: store.destination ? "#1e293b" : "#94a3b8" }}>
            {store.destination || "Enter destination"}
          </h2>
        </div>
        <button onClick={()=>navigate("voice")} className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"><Mic size={17} className="text-white" /></button>
      </div>
      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm mb-4 relative">
        <LiveMap origin={store.originCoords} destination={store.destinationCoords} height={160} />
        <div className="absolute top-3 right-3 z-[400] bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md">
          <div className={`w-1.5 h-1.5 rounded-full ${geo.status==="granted"?"bg-emerald-500 animate-pulse":"bg-amber-400"}`} />
          <span className="text-[10px] font-black text-slate-700">{geo.status==="granted"?"LIVE GPS":"Map"}</span>
        </div>
      </div>
      <form onSubmit={e=>{e.preventDefault();plan(searchQuery);}} className="flex gap-2 mb-4">
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex items-center gap-2.5 px-3 shadow-sm">
          <Navigation size={15} className="text-slate-400 flex-shrink-0" />
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Where to?" className="flex-1 py-3 text-sm text-slate-700 outline-none bg-transparent" />
          {searchQuery&&<button type="button" onClick={()=>setSearchQuery("")}><X size={13} className="text-slate-400" /></button>}
        </div>
        <button type="submit" className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"><Navigation size={16} className="text-white" /></button>
      </form>
      <div className="flex gap-2 mb-4 overflow-x-auto sb pb-0.5">
        {(["all","cheap","fast","safe"] as const).map(key=>(
          <button key={key} onClick={()=>setActiveFilter(key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${activeFilter===key?"bg-blue-600 text-white border-blue-600":"bg-white text-slate-600 border-slate-200"}`}>
            {key.charAt(0).toUpperCase()+key.slice(1)}
          </button>
        ))}
      </div>
      {store.destination ? (
        <AICard icon={<div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center"><Zap size={15} className="text-white" /></div>}
          title={source==="ai"?"Saathi AI Recommendation":"Smart Recommendation"}
          body={notice??(source==="ai"?`"Best options for ${store.destination} — fare, time & safety optimized."`:`"Reliable routes to ${store.destination}."`)}
          color={notice?"amber":"blue"} />
      ) : (
        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0"><Zap size={15} className="text-white" /></div>
          <div><p className="font-black text-blue-800 text-sm">Journey Guardian</p><p className="text-blue-600 text-xs mt-0.5">Type a destination above and tap → to get AI-powered route options.</p></div>
        </div>
      )}
      {loading ? (
        <div className="mt-4 space-y-4">{[0,1,2].map(i=><div key={i} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm animate-pulse"><div className="h-5 w-28 bg-slate-200 rounded-full mb-4" /><div className="h-3 w-44 bg-slate-100 rounded mb-5" /><div className="flex gap-5"><div className="h-8 w-10 bg-slate-100 rounded" /><div className="h-8 w-10 bg-slate-100 rounded" /></div></div>)}</div>
      ) : (
        <div className="mt-4 space-y-4">
          {filtered.map(r=>(
            <button key={r.id} onClick={()=>{store.setSelectedRoute(r);navigate("routeDetail");}}
              className={`w-full text-left rounded-3xl border p-5 shadow-sm active:scale-95 transition-all ${r.highlight?"bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500 shadow-xl shadow-blue-200/50":"bg-white border-slate-100"}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0">
                  <span className={`text-xs font-black px-3 py-1 rounded-full border ${r.highlight?"bg-white/25 text-white border-white/30":"bg-slate-50 text-slate-700 border-slate-200"}`}>{r.badge} {r.label}</span>
                  <p className={`text-sm mt-2 ${r.highlight?"text-blue-100":"text-slate-500"}`}>{r.desc}</p>
                </div>
                <ChevronRight size={17} className={r.highlight?"text-blue-200":"text-slate-300"} />
              </div>
              <div className="flex gap-5 mb-4">
                {[{val:r.fare,label:"Fare"},{val:r.time,label:"Time"},{val:r.safety,label:"Safety"},{val:r.crowd,label:"Crowd"}].map(({val,label})=>(
                  <div key={label}><div className={`text-sm font-black ${r.highlight?"text-white":"text-slate-800"}`}>{val}</div><div className={`text-[9px] mt-0.5 ${r.highlight?"text-blue-200":"text-slate-400"}`}>{label}</div></div>
                ))}
              </div>
              {r.savings&&<div className={`text-xs font-black px-3 py-1.5 rounded-2xl inline-flex items-center gap-1 ${r.highlight?"bg-amber-400 text-amber-900":"bg-emerald-50 text-emerald-700"}`}>✨ {r.savings}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SCREEN 11: ROUTE DETAIL ──────────────────────────────────────────────────
function RouteDetailScreen({ navigate }: { navigate: NavFnT }) {
  const store = useCommuteStore();
  const route = store.selectedRoute;
  const [navStarted, setNavStarted] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const colorFor = (i:number) => ["bg-slate-100","bg-blue-100","bg-violet-100","bg-emerald-100"][i%4];
  const steps = (route?.steps?.length?route.steps:[
    {mode:"Walk",icon:"🚶",duration:"3 min",detail:"Exit from your location"},
    {mode:"Bus 312",icon:"🚌",duration:"15 min",detail:"Towards destination"},
    {mode:"Metro L2",icon:"🚇",duration:"10 min",detail:"Interchange → destination"},
    {mode:"Walk",icon:"🚶",duration:"4 min",detail:"Metro exit → Platform"},
  ]).map((s,i)=>({...s,color:colorFor(i)}));
  const fareBreakdown = route?.fareBreakdown?.length?route.fareBreakdown:[{item:"Bus",fare:"₹8"},{item:"Metro",fare:"₹14"},{item:"Discount",fare:"−₹10"},{item:"Total",fare:"₹12"}];
  return (
    <div className="bg-background pb-24 px-5 pt-14 relative">
      <AnimatePresence>
        {showRating&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/50 z-50 flex items-end">
            <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}} transition={{type:"spring",damping:25}} className="w-full bg-white rounded-t-[32px] p-6 pb-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <h3 className="font-black text-slate-800 text-lg mb-1 text-center">Rate This Trip</h3>
              <div className="flex justify-center gap-2 mb-5">
                {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)}><Star size={36} className={n<=rating?"text-amber-400 fill-amber-400":"text-slate-200"} /></button>)}
              </div>
              <button onClick={()=>{setShowRating(false);toast.success("Thanks for your rating!");}}
                disabled={rating===0} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg disabled:opacity-40">Submit Rating</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <StatusBar />
      <BackHeader title="Journey Guardian 🗺️" sub={`To ${store.destination}`} navigate={navigate} to="routes" />
      <div className="rounded-3xl overflow-hidden mb-5 relative border border-slate-100">
        <LiveMap origin={store.originCoords} destination={store.destinationCoords} height={170} />
        <div className="absolute top-3 right-3 z-[400] bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-md">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] font-black text-slate-700">LIVE</span>
        </div>
      </div>
      <div className="flex gap-3 mb-5">
        {[{label:"Total Fare",value:route?.fare??"₹12",color:"text-blue-600"},{label:"ETA",value:route?.time??"32 min",color:"text-slate-800"},{label:"Safety",value:`${route?.safety??"9.2"}/10`,color:"text-emerald-600"}].map(({label,value,color})=>(
          <div key={label} className="flex-1 bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-sm">
            <div className={`text-base font-black ${color}`}>{value}</div><div className="text-[9px] text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2 mb-5">
        {steps.map((s,i)=>(
          <div key={i} className="flex gap-3 items-start">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-11 h-11 ${s.color} rounded-2xl flex items-center justify-center text-2xl`}>{s.icon}</div>
              {i<steps.length-1&&<div className="w-0.5 h-6 bg-slate-200 mt-1" />}
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-3 flex-1 shadow-sm">
              <div className="flex justify-between items-center"><span className="font-black text-slate-800 text-sm">{s.mode}</span><span className="text-xs text-blue-600 font-bold">{s.duration}</span></div>
              <span className="text-xs text-slate-400 mt-0.5 block">{s.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-5 shadow-sm">
        <h4 className="font-black text-slate-700 mb-3 text-sm">Fare Breakdown</h4>
        {fareBreakdown.map(({item,fare},i)=>{
          const bold=item.toLowerCase()==="total"||i===fareBreakdown.length-1;
          return <div key={i} className={`flex justify-between py-1.5 ${bold?"border-t border-slate-100 mt-1 pt-3":""}`}><span className={`text-sm ${bold?"font-black text-slate-800":"text-slate-500"}`}>{item}</span><span className={`text-sm ${bold?"font-black text-blue-600":fare.startsWith("−")?"text-emerald-600 font-semibold":"text-slate-600"}`}>{fare}</span></div>;
        })}
      </div>
      <div className="flex gap-3">
        <button onClick={()=>{setNavStarted(true);toast.success("Journey Guardian Active!",{description:`Navigating to ${store.destination}`});setTimeout(()=>setShowRating(true),3000);}}
          className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${navStarted?"bg-emerald-500 text-white":"bg-blue-600 text-white"}`}>
          <Navigation size={17} />{navStarted?"Navigating…":"Start Navigation"}
        </button>
        <button onClick={()=>toast.success("Saved for offline")} className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm"><Download size={17} className="text-slate-500" /></button>
      </div>
    </div>
  );
}

// ─── SCREEN 12: WAGE GUARDIAN ─────────────────────────────────────────────────
function WageGuardianScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { wage, setWage, persisted } = useWage();
  const commute = 180;
  const pct = Math.min(100, Math.round((commute/wage)*100));
  const risky = pct>=20;
  return (
    <div className="bg-background pb-24 px-5 pt-14">
      <StatusBar />
      <BackHeader title={t.wageTitle} sub={t.wageSubtitle} navigate={navigate} to="home" />
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[28px] p-6 mb-5 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/8 rounded-full" />
        <div className="flex items-center justify-between mb-1">
          <p className="text-emerald-100 text-sm">Your Daily Wage</p>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{persisted?"● Synced":"On device"}</span>
        </div>
        <div className="text-white font-black leading-none mb-1" style={{fontFamily:"Plus Jakarta Sans, sans-serif",fontSize:"52px"}}>₹{wage}</div>
        <p className="text-emerald-100 text-xs mb-3">per day</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${risky?"bg-red-400":"bg-amber-400"}`} style={{width:`${pct}%`}} />
          </div>
          <span className="text-white font-black text-sm">{pct}%</span>
        </div>
        <p className="text-emerald-100 text-xs mt-2">of income spent on commute (₹{commute} today)</p>
      </div>
      {risky&&<div className="bg-red-50 border border-red-100 rounded-3xl p-4 mb-4"><div className="flex items-start gap-3"><span className="text-3xl">⚠️</span><div><p className="font-black text-red-700 text-sm">AI Alert — High Commute Cost</p><p className="text-red-600 text-xs mt-0.5">"Aaj commute pe ₹{commute} kharch kiye — {pct}% of daily income!"</p></div></div></div>}
      <AICard icon={<span className="text-3xl">💡</span>} title="Save ₹160 Today" body='"Bus route use karoge toh sirf ₹20 lagenge instead of ₹180. Monthly ₹4,800 bachega!"' color="emerald" />
      <div className="mt-4 space-y-3">
        <h3 className="font-black text-slate-700 text-sm">Weekly Wage vs Commute Cost</h3>
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={WAGE_DATA} barSize={10}>
              <XAxis dataKey="day" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} />
              <YAxis hide /><Tooltip contentStyle={{fontSize:10,borderRadius:12,border:"none"}} />
              <Bar dataKey="wage" fill="#10B981" radius={[4,4,0,0]} name="Wage" />
              <Bar dataKey="commute" fill="#F59E0B" radius={[4,4,0,0]} name="Commute" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="font-black text-slate-700 text-sm mb-3">Adjust Daily Wage</h3>
        <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
          <input type="range" min={300} max={2000} step={50} value={wage} onChange={e=>setWage(Number(e.target.value))} className="w-full accent-emerald-500" />
          <div className="flex justify-between text-xs text-slate-400 mt-1"><span>₹300</span><span className="font-black text-emerald-600">₹{wage}/day</span><span>₹2000</span></div>
        </div>
      </div>
      <button onClick={()=>navigate("routes")} className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform">
        🗺️ Show Cheapest Route
      </button>
    </div>
  );
}

// ─── SCREEN 13: SAFETY LAYER ──────────────────────────────────────────────────
function SafetyScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  return (
    <div className="bg-background pb-24 px-5 pt-14">
      <StatusBar />
      <BackHeader title={t.safetyTitle} sub={t.safetySubtitle} navigate={navigate} to="home" />
      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[28px] p-6 mb-5 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/8 rounded-full" />
        <p className="text-emerald-100 text-sm mb-2">Route Safety Score</p>
        <div className="text-white font-black mb-1 leading-none" style={{fontFamily:"Plus Jakarta Sans, sans-serif",fontSize:"72px"}}>9.4</div>
        <div className="text-emerald-100 text-lg">/ 10</div>
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          <span className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full font-semibold">⭐ Excellent</span>
          <span className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full font-semibold">✅ Community Verified</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[{emoji:"💡",label:"Streetlight Coverage",value:"94%",color:"bg-amber-50 border-amber-100"},{emoji:"👥",label:"Crowd Confidence",value:"High",color:"bg-blue-50 border-blue-100"},{emoji:"🌙",label:"Night Confidence",value:"8.8/10",color:"bg-indigo-50 border-indigo-100"},{emoji:"📹",label:"CCTV Coverage",value:"87%",color:"bg-emerald-50 border-emerald-100"}].map(({emoji,label,value,color})=>(
          <div key={label} className={`${color} border rounded-3xl p-4`}><span className="text-3xl block mb-2">{emoji}</span><div className="text-slate-800 font-black text-base">{value}</div><div className="text-slate-500 text-xs mt-0.5">{label}</div></div>
        ))}
      </div>
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-5 shadow-sm">
        <h3 className="font-black text-slate-700 text-sm mb-3">Safety Breakdown</h3>
        {[{label:"Women's Confidence",score:9.1,color:"bg-purple-400"},{label:"Harassment-Free Index",score:9.7,color:"bg-emerald-400"},{label:"Night Travel Safety",score:8.6,color:"bg-blue-400"},{label:"Bus Driver Conduct",score:9.5,color:"bg-amber-400"}].map(({label,score,color})=>(
          <div key={label} className="mb-3">
            <div className="flex justify-between mb-1"><span className="text-xs text-slate-600 font-semibold">{label}</span><span className="text-xs font-black text-slate-800">{score}/10</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{width:`${score*10}%`}} /></div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 mb-5">
        <button onClick={()=>navigate("womenScore")} className="flex-1 bg-purple-50 border border-purple-100 rounded-2xl py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <span className="text-2xl">🌙</span><span className="text-purple-700 text-xs font-black">{t.womenScore}</span>
        </button>
        <button onClick={()=>navigate("safeCompanion")} className="flex-1 bg-pink-50 border border-pink-100 rounded-2xl py-4 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
          <span className="text-2xl">👭</span><span className="text-pink-700 text-xs font-black">{t.safeCompanion}</span>
        </button>
      </div>
      <button onClick={()=>navigate("sos")} className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
        <AlertCircle size={19} />Emergency SOS →
      </button>
    </div>
  );
}

// ─── SCREEN 14: SAFE COMPANION ────────────────────────────────────────────────
function SafeCompanionScreen({ navigate }: { navigate: NavFnT }) {
  const { state } = useAppState();
  const [active, setActive] = useState(false);
  const [checkIn, setCheckIn] = useState<"waiting"|"ok"|"alert">("waiting");
  const contacts = state.emergencyContacts.length > 0 ? state.emergencyContacts : [
    { name: "Family Member", phone: "+91 98765 43210", relation: "Family" },
    { name: "Trusted Friend", phone: "+91 87654 32109", relation: "Friend" },
  ];
  return (
    <div className="bg-background pb-24 px-5 pt-14">
      <StatusBar />
      <BackHeader title="Safe Companion 👭" sub="Live Safety Tracking" navigate={navigate} to="safety" />
      <div className={`rounded-[28px] p-6 mb-5 shadow-xl transition-all ${active?"bg-gradient-to-br from-pink-500 to-rose-600":"bg-gradient-to-br from-slate-600 to-slate-700"}`}>
        <p className={`text-sm mb-4 ${active?"text-pink-100":"text-slate-300"}`}>{active?"🟢 Companion Mode Active":"⚪ Companion Mode Off"}</p>
        <motion.button onClick={()=>{setActive(a=>{if(!a)toast("👭 Safe Companion Active",{description:"Contacts are watching your route"});return!a;});}} whileTap={{scale:0.95}}
          className={`w-full py-4 rounded-2xl font-black text-lg mb-3 shadow-lg transition-all ${active?"bg-white text-pink-600":"bg-pink-500 text-white"}`}>
          {active?"✅ Protection Active":"Activate Safe Mode"}
        </motion.button>
        {active&&<div className="space-y-2 slide-up">
          <div className="bg-white/20 rounded-2xl p-3 flex items-center gap-2"><MapPin size={15} className="text-white flex-shrink-0" /><span className="text-white text-xs">Live route shared with {contacts.length} contacts</span></div>
          <div className="bg-white/20 rounded-2xl p-3 flex items-center gap-2"><Clock size={15} className="text-white flex-shrink-0" /><span className="text-white text-xs">Safety check-in every 10 minutes</span></div>
        </div>}
      </div>
      {active&&(
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mb-5">
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-3">
            <div className="flex items-center justify-between mb-3"><p className="font-black text-slate-700 text-sm">AI Check-in</p><div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" /></div>
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-3 mb-3"><p className="text-pink-700 font-black text-sm">🤖 Saathi asks:</p><p className="text-pink-600 text-sm mt-1">"Sab theek hai? Aap 5 minutes se ek jagah hain."</p></div>
            <div className="flex gap-2">
              <button onClick={()=>setCheckIn("ok")} className={`flex-1 py-3 rounded-2xl font-black text-sm ${checkIn==="ok"?"bg-emerald-500 text-white":"bg-emerald-50 text-emerald-700 border border-emerald-100"}`}>✅ Sab Theek Hai</button>
              <button onClick={()=>{setCheckIn("alert");navigate("sos");}} className={`flex-1 py-3 rounded-2xl font-black text-sm ${checkIn==="alert"?"bg-red-500 text-white":"bg-red-50 text-red-700 border border-red-100"}`}>🆘 Help Chahiye</button>
            </div>
          </div>
        </motion.div>
      )}
      <h3 className="font-black text-slate-700 text-sm mb-3">Protected Contacts</h3>
      <div className="space-y-3">
        {contacts.map((c,i)=>(
          <div key={i} className="bg-pink-50 border border-pink-100 rounded-3xl p-4 flex items-center gap-3">
            <span className="text-3xl leading-none">👤</span>
            <div className="flex-1"><div className="font-black text-slate-800 text-sm">{c.name}</div><div className="text-slate-500 text-xs">{c.phone} {c.relation&&`· ${c.relation}`}</div></div>
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SCREEN 15: WOMEN'S SCORE ─────────────────────────────────────────────────
function WomenScoreScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  return (
    <div className="bg-background pb-24 px-5 pt-14">
      <StatusBar />
      <BackHeader title={t.womenScore} sub="Female Safety Index" navigate={navigate} to="safety" />
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-[28px] p-6 mb-5 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/8 rounded-full" />
        <p className="text-purple-100 text-sm mb-2">Women Confidence Score</p>
        <div className="text-white font-black mb-1 leading-none" style={{fontFamily:"Plus Jakarta Sans, sans-serif",fontSize:"72px"}}>9.1</div>
        <div className="text-purple-100 text-lg">/ 10</div>
        <div className="flex justify-center gap-2 mt-4 flex-wrap">
          <span className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full font-semibold">💜 Women Verified</span>
          <span className="bg-white/25 text-white text-xs px-3 py-1.5 rounded-full font-semibold">🌙 Night Safe</span>
        </div>
        <p className="text-purple-100 text-xs mt-3">Based on 184 women's reports this month</p>
      </div>
      <div className="space-y-3 mb-5">
        {[{label:"Street Lighting",score:9.4,reports:78,icon:"💡"},{label:"CCTV + Police",score:8.8,reports:45,icon:"📹"},{label:"Crowd Behavior",score:9.2,reports:112,icon:"👥"},{label:"Night Travel",score:8.6,reports:56,icon:"🌙"},{label:"Bus Driver Conduct",score:9.5,reports:34,icon:"🚌"},{label:"Harassment Reports",score:9.7,reports:184,icon:"🛡️"}].map(({label,score,reports,icon})=>(
          <div key={label} className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><span className="text-xl">{icon}</span><span className="font-black text-slate-800 text-sm">{label}</span></div><span className={`font-black text-sm ${score>=9?"text-emerald-600":score>=8?"text-blue-600":"text-amber-600"}`}>{score}</span></div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${score>=9?"bg-emerald-400":score>=8?"bg-blue-400":"bg-amber-400"}`} style={{width:`${score*10}%`}} /></div>
            <div className="text-slate-400 text-[10px] mt-1">Based on {reports} reports</div>
          </div>
        ))}
      </div>
      <button onClick={()=>navigate("safeCompanion")} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
        <Shield size={18} />Activate Safe Companion Mode
      </button>
    </div>
  );
}

// ─── SOS LOCATION LABEL (resolves address from coords) ───────────────────────
function SOSLocationLabel({ coords }: { coords: { lat: number; lng: number } }) {
  const { address, loading } = useAddressFromCoords(coords);
  if (loading) return <p className="text-red-200 text-xs mt-0.5">📍 Locating…</p>;
  if (address) return <p className="text-red-200 text-xs mt-0.5">📍 {address}</p>;
  return <p className="text-red-200 text-xs mt-0.5">📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>;
}

// ─── SCREEN 16: SOS — Full Emergency Suite ───────────────────────────────────
function SOSScreen({ navigate }: { navigate: NavFnT }) {
  const { t } = useLang();
  const { state } = useAppState();
  const geo = useGeolocation();
  const alarm = useAlarm();
  const [activated, setActivated] = useState(false);
  const [alarmOn, setAlarmOn] = useState(false);
  const [liveLink, setLiveLink] = useState<string | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [smsContacts, setSmsContacts] = useState<string[]>([]);
  const activatedRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => { geo.request(); }, []);

  // Auto-load nearby when GPS available
  useEffect(() => {
    if (geo.coords && nearby.length === 0) {
      setLoadingNearby(true);
      fetchNearbyServices(geo.coords.lat, geo.coords.lng)
        .then(r => setNearby(r))
        .catch(() => {})
        .finally(() => setLoadingNearby(false));
    }
  }, [geo.coords]);

  // Shake detection
  useEffect(() => {
    let lx = 0, ly = 0, lz = 0, ls = 0;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a?.x) return;
      const d = Math.abs(a.x - lx) + Math.abs((a.y??0) - ly) + Math.abs((a.z??0) - lz);
      [lx, ly, lz] = [a.x, a.y??0, a.z??0];
      const now = Date.now();
      if (d > 20 && now - ls > 2500 && !activatedRef.current) {
        ls = now;
        toast.warning("📳 " + t.shakeDetected, { duration: 2000 });
        startCountdown();
      }
    };
    window.addEventListener("devicemotion", handler as EventListener);
    return () => { window.removeEventListener("devicemotion", handler as EventListener); clearInterval(countdownRef.current!); };
  }, []);

  function buildLink(coords?: { lat: number; lng: number } | null) {
    return coords ? `https://maps.google.com/?q=${coords.lat},${coords.lng}` : "https://maps.google.com/?q=Mumbai,India";
  }

  function startCountdown() {
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c === null || c <= 1) { clearInterval(countdownRef.current!); activateSOS(); return null; }
        return c - 1;
      });
    }, 1000);
  }

  function cancelCountdown() {
    clearInterval(countdownRef.current!);
    setCountdown(null);
  }

  function activateSOS() {
    if (activatedRef.current) return;
    activatedRef.current = true;
    const link = buildLink(geo.coords);
    setLiveLink(link);
    setActivated(true);
    setAlarmOn(true);
    alarm.start();
    // Vibration SOS pattern (... --- ...)
    if ("vibrate" in navigator) navigator.vibrate([200,100,200,100,200,300,500,300,500,300,500,300,200,100,200,100,200]);
    // Auto-send SMS to all contacts
    const contacts = state.emergencyContacts.length > 0 ? state.emergencyContacts : [];
    setSmsContacts(contacts.map(c => c.phone));
    toast.error("🆘 SOS ACTIVATED!", { description: "Alarm on · Vibrating · Location ready · Call Police NOW" });
  }

  function deactivateSOS() {
    activatedRef.current = false;
    setActivated(false);
    setAlarmOn(false);
    alarm.stop();
    if ("vibrate" in navigator) navigator.vibrate(0);
    setCountdown(null);
    clearInterval(countdownRef.current!);
  }

  function toggleAlarm() {
    if (alarmOn) { alarm.stop(); setAlarmOn(false); } else { alarm.start(); setAlarmOn(true); }
  }

  function sendSMS(phone: string, msg: string) {
    window.open(`sms:${phone}?body=${encodeURIComponent(msg)}`, "_blank");
  }

  function sendAllSMS() {
    const link = liveLink ?? buildLink(geo.coords);
    const msg = `🆘 EMERGENCY SOS! Mujhe turant madad chahiye. Meri location: ${link} — Abhi call karo ya police bulao! (Police: 100, Ambulance: 108)`;
    const allContacts = state.emergencyContacts.length > 0 ? state.emergencyContacts : [];
    if (allContacts.length === 0) { toast.error("No contacts saved. Add in Emergency Setup."); return; }
    allContacts.forEach((c, i) => setTimeout(() => sendSMS(c.phone, msg), i * 300));
    toast.success(`📱 SMS sent to ${allContacts.length} contacts!`);
  }

  function shareWhatsApp() {
    const link = liveLink ?? buildLink(geo.coords);
    const msg = encodeURIComponent(`🆘 *EMERGENCY SOS!* I need immediate help!\n\n📍 My live location: ${link}\n\nPlease come NOW or call Police (100) / Ambulance (108)`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    toast.success(t.sosShared);
  }

  function copyLink() {
    const link = liveLink ?? buildLink(geo.coords);
    navigator.clipboard.writeText(link).catch(() => {});
    toast.success(t.sosCopied);
  }

  function openNearbyInMaps(place: NearbyPlace) {
    window.open(`https://maps.google.com/maps?q=${place.lat},${place.lon}&z=16`, "_blank");
  }

  function getDirections(place: NearbyPlace) {
    const origin = geo.coords ? `${geo.coords.lat},${geo.coords.lng}` : "";
    window.open(`https://maps.google.com/maps?saddr=${origin}&daddr=${place.lat},${place.lon}`, "_blank");
  }

  const contacts = state.emergencyContacts.length > 0 ? state.emergencyContacts : [
    { name: "Police Control", phone: "100", relation: "National Helpline" },
    { name: "Ambulance", phone: "108", relation: "Medical Emergency" },
    { name: "Women Helpline", phone: "1091", relation: "Women Safety" },
    { name: "Disaster Mgmt", phone: "1078", relation: "Disaster Relief" },
  ];

  const placeIcon = (type: NearbyPlace["type"]) => type === "police" ? "👮" : "🏥";
  const placeColor = (type: NearbyPlace["type"]) => type === "police" ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100";

  return (
    <div className={`min-h-full pb-24 px-5 pt-14 transition-colors duration-700 ${activated?"bg-red-950/5 bg-background":"bg-background"}`}>
      <StatusBar />

      {/* Countdown banner */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}
            className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-4 flex items-center justify-center gap-3">
            <span className="font-black text-2xl">{countdown}</span>
            <span className="font-bold">SOS activating…</span>
            <button onClick={cancelCountdown} className="bg-white text-red-600 px-3 py-1 rounded-xl font-black text-sm ml-2">CANCEL</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-red-500 text-xs font-black uppercase tracking-widest">🆘 Emergency Hub</p>
          <h2 className="text-xl font-black text-slate-800" style={{fontFamily:"Plus Jakarta Sans, sans-serif"}}>{t.sosTitle}</h2>
        </div>
        {activated && (
          <div className="flex items-center gap-1.5 bg-red-100 border border-red-200 rounded-2xl px-3 py-1.5">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-700 text-xs font-black">LIVE</span>
          </div>
        )}
      </div>

      {/* Main SOS Button */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative mb-4">
          {activated && <><div className="absolute inset-0 bg-red-400 rounded-full pr1 opacity-70" /><div className="absolute inset-0 bg-red-500 rounded-full pr2 opacity-50" /></>}
          <motion.button
            onClick={() => activated ? deactivateSOS() : activateSOS()}
            whileTap={{ scale: 0.88 }}
            animate={activated ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.5)] transition-all duration-300 ${activated ? "bg-red-700" : "bg-gradient-to-br from-red-500 to-red-700"}`}>
            <AlertCircle size={50} className="text-white mb-1" strokeWidth={2} />
            <span className="text-white font-black text-3xl" style={{fontFamily:"Plus Jakarta Sans, sans-serif"}}>SOS</span>
            <span className="text-red-200 text-[11px] mt-0.5 font-semibold">{activated ? "Tap to STOP" : t.sosTap}</span>
          </motion.button>
        </div>

        {/* Activated action bar */}
        <AnimatePresence>
          {activated && (
            <motion.div initial={{opacity:0,y:12,scale:0.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8}}
              className="w-full space-y-2">
              {/* Status */}
              <div className="bg-red-600 rounded-3xl px-4 py-3 text-center">
                <p className="text-white font-black text-sm">🆘 SOS ACTIVE — Help is on the way!</p>
                {geo.coords
                  ? <SOSLocationLabel coords={geo.coords} />
                  : <p className="text-red-300 text-xs mt-0.5">📍 Location updating…</p>
                }
              </div>

              {/* Quick calls */}
              <div className="grid grid-cols-2 gap-2">
                <a href="tel:100" className="bg-blue-700 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg">
                  <Phone size={15} />Police 100
                </a>
                <a href="tel:108" className="bg-red-600 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg">
                  <Phone size={15} />Ambulance 108
                </a>
              </div>

              {/* Alarm + Share row */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={toggleAlarm}
                  className={`py-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${alarmOn?"bg-amber-500 text-white":"bg-amber-50 border border-amber-200 text-amber-700"}`}>
                  <span className="text-base">{alarmOn?"🔇":"🔔"}</span>
                  {alarmOn?"Stop Alarm":"Alarm"}
                </button>
                <button onClick={copyLink}
                  className="bg-blue-50 border border-blue-200 text-blue-700 py-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform">
                  <MapPin size={16} />Copy Link
                </button>
                <button onClick={shareWhatsApp}
                  className="bg-emerald-600 text-white py-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform">
                  <MessageCircle size={16} />WhatsApp
                </button>
              </div>

              {/* SMS all */}
              <button onClick={sendAllSMS}
                className="w-full bg-violet-600 text-white py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg">
                <MessageCircle size={16} />📱 SMS All Emergency Contacts
              </button>

              {/* Live link */}
              {liveLink && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <p className="text-slate-400 text-[9px] mb-1 font-black uppercase tracking-wider">Live Location Link</p>
                  <a href={liveLink} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 text-xs font-semibold break-all">{liveLink}</a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shake hint */}
      {!activated && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4 flex items-center gap-2.5">
          <span className="text-xl">📳</span>
          <div>
            <p className="text-amber-800 text-xs font-black">Shake to SOS</p>
            <p className="text-amber-600 text-[11px]">Shake phone hard 3× to auto-trigger emergency countdown</p>
          </div>
        </div>
      )}

      {/* One-tap call row (always visible) */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[{n:"Police",p:"100",e:"👮"},{n:"Ambulance",p:"108",e:"🚑"},{n:"Women",p:"1091",e:"🆘"},{n:"Fire",p:"101",e:"🔥"}].map(({n,p,e})=>(
          <a key={p} href={`tel:${p}`}
            className="bg-white border border-slate-100 rounded-2xl py-3 flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-transform">
            <span className="text-2xl leading-none">{e}</span>
            <span className="text-slate-800 font-black text-[10px]">{n}</span>
            <span className="text-blue-600 font-black text-xs">{p}</span>
          </a>
        ))}
      </div>

      {/* Nearby emergency services */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-slate-700 text-sm">📍 Nearby Help</h3>
          {loadingNearby && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
          {!loadingNearby && !geo.coords && (
            <button onClick={() => geo.request()} className="text-blue-600 text-xs font-semibold">Enable GPS →</button>
          )}
        </div>
        {nearby.length > 0 ? (
          <div className="space-y-2">
            {nearby.map((place) => (
              <div key={place.id} className={`${placeColor(place.type)} border rounded-2xl p-3.5 flex items-center gap-3`}>
                <span className="text-2xl leading-none flex-shrink-0">{placeIcon(place.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm truncate">{place.name}</p>
                  <p className="text-slate-500 text-xs capitalize">{place.type} · {place.distanceM < 1000 ? `${place.distanceM}m` : `${(place.distanceM/1000).toFixed(1)}km`} away</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {place.phone && (
                    <a href={`tel:${place.phone}`} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Phone size={13} className="text-emerald-600" />
                    </a>
                  )}
                  <button onClick={() => getDirections(place)} className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Navigation size={13} className="text-blue-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : loadingNearby ? (
          <div className="space-y-2">
            {[0,1,2].map(i => <div key={i} className="bg-slate-100 rounded-2xl h-14 animate-pulse" />)}
          </div>
        ) : geo.coords ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-slate-400 text-xs">No nearby services found in 4km radius</p>
            <button onClick={() => { setLoadingNearby(true); fetchNearbyServices(geo.coords!.lat, geo.coords!.lng).then(setNearby).catch(()=>{}).finally(()=>setLoadingNearby(false)); }}
              className="text-blue-600 text-xs font-bold mt-1">Retry search</button>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
            <p className="text-blue-600 text-xs font-semibold">Enable GPS to find nearby police stations, hospitals & ambulances</p>
          </div>
        )}
      </div>

      {/* Emergency contacts */}
      <h3 className="font-black text-slate-700 text-sm mb-3">🆘 Emergency Contacts</h3>
      <div className="space-y-2.5 mb-4">
        {contacts.map((c, i) => {
          const link = liveLink ?? buildLink(geo.coords);
          const smsMsg = `🆘 SOS! I need help. Location: ${link} — Please come now or call 100.`;
          return (
            <div key={i} className="bg-white border border-slate-100 rounded-3xl p-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl">
                {i===0?"👮":i===1?"🚑":i===2?"🆘":"🔥"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-800 text-sm">{c.name}</div>
                <div className="text-slate-400 text-xs">{c.phone}{c.relation ? ` · ${c.relation}` : ""}</div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button onClick={() => sendSMS(c.phone, smsMsg)}
                  className="w-9 h-9 bg-violet-50 border border-violet-100 rounded-2xl flex items-center justify-center">
                  <MessageCircle size={13} className="text-violet-600" />
                </button>
                <a href={`tel:${c.phone}`}
                  className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center">
                  <Phone size={13} className="text-emerald-600" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => navigate("safety")}
        className="w-full bg-slate-50 border border-slate-100 text-slate-600 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
        <Shield size={15} />View Safety Dashboard
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
// ─── SCREEN 17: PROFILE ───────────────────────────────────────────────────────
function ProfileScreen({ navigate }: { navigate: NavFnT }) {
  const { lang, setLang, t } = useLang();
  const { state, update } = useAppState();
  const { user } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(state.userName || user?.displayName || "");
  const [wageInput, setWageInput] = useState(state.dailyWage ?? 600);
  const [savedWage, setSavedWage] = useState(false);

  const langs: { code: LangCode; flag: string; name: string; native: string }[] = [
    { code:"hi", flag:"🇮🇳", name:"Hindi",   native:"हिंदी" },
    { code:"ta", flag:"🇮🇳", name:"Tamil",   native:"தமிழ்" },
    { code:"te", flag:"🇮🇳", name:"Telugu",  native:"తెలుగు" },
    { code:"en", flag:"🇮🇳", name:"English", native:"English" },
  ];

  const personaColors: Record<string, string> = {
    [t.userTypes[0]]: "from-emerald-500 to-teal-600",
    [t.userTypes[1]]: "from-blue-500 to-indigo-600",
    [t.userTypes[2]]: "from-orange-500 to-amber-600",
    [t.userTypes[3]]: "from-purple-500 to-pink-600",
    [t.userTypes[4]]: "from-blue-500 to-cyan-600",
    [t.userTypes[5]]: "from-teal-500 to-emerald-600",
  };
  const avatarGrad = state.userType ? (personaColors[state.userType] ?? "from-blue-500 to-indigo-600") : "from-slate-400 to-slate-500";
  const userIcon = state.userType ? t.userTypeIcons[t.userTypes.indexOf(state.userType as any)] : "👤";

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed) { update({ userName: trimmed }); toast.success("Name updated!"); }
    setEditingName(false);
  }

  function saveWage() {
    update({ dailyWage: wageInput });
    setSavedWage(true);
    toast.success(`Daily wage set to ₹${wageInput}`);
    setTimeout(() => setSavedWage(false), 2000);
  }

  function resetOnboarding() {
    update({ userType: null, userName: null, emergencyContacts: [], permissionsGranted: false, dailyWage: null });
    navigate("language");
  }

  return (
    <div className="bg-background pb-28 px-5 pt-14 min-h-full">
      <StatusBar />
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate("home")}
          className="w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm">
          <ArrowLeft size={17} className="text-slate-600" />
        </button>
        <div>
          <p className="text-slate-400 text-xs">Account</p>
          <h2 className="text-xl font-black text-slate-800" style={{ fontFamily:"Plus Jakarta Sans, sans-serif" }}>My Profile</h2>
        </div>
      </div>

      {/* Avatar card */}
      <div className={`bg-gradient-to-br ${avatarGrad} rounded-[28px] p-5 mb-4 shadow-xl`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg">
            {userIcon}
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveName()}
                  autoFocus
                  className="flex-1 bg-white/20 border border-white/40 rounded-xl px-3 py-1.5 text-white text-sm font-bold placeholder:text-white/50 outline-none min-w-0"
                  placeholder="Your name"
                />
                <button onClick={saveName} className="bg-white/25 border border-white/30 rounded-xl px-2.5 text-white text-xs font-black">✓</button>
                <button onClick={() => setEditingName(false)} className="bg-white/10 border border-white/20 rounded-xl px-2.5 text-white/60 text-xs">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-white font-black text-lg truncate" style={{ fontFamily:"Plus Jakarta Sans, sans-serif" }}>
                  {state.userName || user?.displayName || "Saathi User"}
                </p>
                <button onClick={() => { setNameInput(state.userName || user?.displayName || ""); setEditingName(true); }}
                  className="bg-white/20 border border-white/25 rounded-lg px-2 py-0.5 text-white text-[10px] font-black flex-shrink-0">
                  ✏️ Edit
                </button>
              </div>
            )}
            <p className="text-white/70 text-sm truncate mt-0.5">
              {user?.email || user?.phoneNumber || "Guest Mode"}
            </p>
          </div>
        </div>
        {state.userType && (
          <div className="bg-white/20 rounded-xl px-3 py-1 inline-block">
            <span className="text-white text-xs font-black">{state.userType}</span>
          </div>
        )}
      </div>

      {/* User Type selector */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 shadow-sm">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <UserCheck size={12} className="text-blue-500" />Commuter Type
        </p>
        <div className="grid grid-cols-3 gap-2">
          {t.userTypes.map((type, i) => (
            <button key={type} onClick={() => { update({ userType: type }); toast.success(`Profile updated: ${type}`); }}
              className={`rounded-2xl p-2.5 flex flex-col items-center gap-1 border transition-all active:scale-95 ${
                state.userType === type ? "bg-blue-600 border-blue-600 shadow-md" : "bg-slate-50 border-slate-100"
              }`}>
              <span className="text-2xl leading-none">{t.userTypeIcons[i]}</span>
              <span className={`text-[9px] font-black text-center leading-tight ${state.userType===type?"text-white":"text-slate-600"}`}>
                {type.split(" ").slice(0,2).join(" ")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Wage */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 shadow-sm">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
          💰 Daily Wage (for Wage Guardian)
        </p>
        <div className="flex items-center gap-3 mb-2">
          <input
            type="number"
            min={100}
            max={10000}
            value={wageInput}
            onChange={e => setWageInput(Number(e.target.value))}
            className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-emerald-400"
          />
          <span className="text-slate-500 text-sm">₹ / day</span>
          <button onClick={saveWage}
            className={`ml-auto px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${savedWage ? "bg-emerald-500 text-white" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
            {savedWage ? "✓ Saved" : "Save"}
          </button>
        </div>
        <input type="range" min={100} max={5000} step={50} value={wageInput}
          onChange={e => setWageInput(Number(e.target.value))}
          className="w-full accent-emerald-500" />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>₹100</span>
          <span className="font-black text-emerald-600">₹{wageInput}/day</span>
          <span>₹5000</span>
        </div>
      </div>

      {/* Language selector */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 shadow-sm">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Globe size={12} className="text-blue-500" />Language / भाषा
        </p>
        <div className="grid grid-cols-2 gap-2">
          {langs.map(({ code, flag, name, native }) => (
            <button key={code} onClick={() => setLang(code)}
              className={`rounded-2xl px-3 py-3 flex items-center gap-2.5 border transition-all active:scale-95 ${
                lang === code ? "bg-blue-50 border-blue-400 shadow-sm" : "bg-slate-50 border-slate-100"
              }`}>
              <span className="text-2xl leading-none">{flag}</span>
              <div className="text-left flex-1">
                <div className={`font-black text-sm ${lang===code?"text-blue-700":"text-slate-700"}`}>{native}</div>
                <div className="text-slate-400 text-[10px]">{name}</div>
              </div>
              {lang === code && <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency contacts */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Phone size={12} className="text-red-500" />Emergency Contacts
          </p>
          <button onClick={() => navigate("emergencySetup")} className="text-blue-600 text-xs font-black">Edit →</button>
        </div>
        {state.emergencyContacts.length > 0 ? (
          <div className="space-y-2">
            {state.emergencyContacts.slice(0,3).map((c,i) => (
              <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-2xl px-3 py-2">
                <span className="text-xl leading-none">{i===0?"👮":i===1?"👨‍👩‍👧":"👯"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-xs truncate">{c.name}</p>
                  <p className="text-slate-400 text-[10px]">{c.phone}{c.relation ? ` · ${c.relation}` : ""}</p>
                </div>
                <a href={`tel:${c.phone}`} className="w-7 h-7 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                  <Phone size={12} className="text-emerald-600" />
                </a>
              </div>
            ))}
            {state.emergencyContacts.length > 3 && (
              <p className="text-slate-400 text-xs text-center">+{state.emergencyContacts.length-3} more</p>
            )}
          </div>
        ) : (
          <button onClick={() => navigate("emergencySetup")}
            className="w-full bg-red-50 border border-dashed border-red-200 rounded-2xl py-3 text-red-500 text-xs font-black active:scale-95 transition-transform">
            + Add Emergency Contacts
          </button>
        )}
      </div>

      {/* App info */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 mb-3 shadow-sm">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">App Info</p>
        {[
          { label:"Version", value:"1.0 · Hackathon Demo" },
          { label:"AI Engine", value:"Groq llama-3.3-70b" },
          { label:"Safety Score", value:"9.4 / 10" },
        ].map(({label,value}) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
            <span className="text-slate-500 text-sm">{label}</span>
            <span className="text-slate-800 text-sm font-semibold">{value}</span>
          </div>
        ))}
      </div>

      <button onClick={resetOnboarding}
        className="w-full bg-slate-50 border border-slate-200 text-slate-500 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
        <RefreshCw size={14} />Reset & Redo Onboarding
      </button>
    </div>
  );
}

function CommuteSaathiAppInner() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [activeNav, setActiveNav] = useState<Screen>("home");
  const { state } = useAppState();

  const navigate: NavFnT = (s) => {
    setScreen(s);
    if (["home","routes","safety","sos","profile"].includes(s)) setActiveNav(s);
  };

  useEffect(() => {
    if (state.userType && screen === "splash") {
      const timer = setTimeout(() => setScreen("home"), 2800);
      return () => clearTimeout(timer);
    }
  }, []);

  const noBottomNav: Screen[] = ["splash","language","auth","otp","userType","permissions","emergencySetup","aiPersonalization","voice"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 sb" style={{ fontFamily: "Noto Sans, sans-serif" }}>
      <Toaster position="top-center" richColors toastOptions={{ style: { borderRadius:"16px", fontSize:"13px" } }} />
      <style>{STYLES}</style>
      <div className="relative w-[390px] h-[844px] rounded-[44px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.7)] border border-white/10 flex-shrink-0">
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50 shadow-lg" />
        <div className="absolute inset-0 bg-background">
          <AnimatePresence mode="wait">
            <motion.div key={screen} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}}
              transition={{duration:0.22,ease:[0.25,0.46,0.45,0.94]}} className="absolute inset-0 overflow-y-auto sb">
              {screen==="splash"           && <SplashScreen navigate={navigate} />}
              {screen==="language"         && <LanguageScreen navigate={navigate} />}
              {screen==="auth"             && <AuthScreen navigate={navigate} />}
              {screen==="otp"              && <LanguageScreen navigate={navigate} />}
              {screen==="userType"         && <UserTypeScreen navigate={navigate} />}
              {screen==="permissions"      && <PermissionsScreen navigate={navigate} />}
              {screen==="emergencySetup"   && <EmergencySetupScreen navigate={navigate} />}
              {screen==="aiPersonalization"&& <AIPersonalizationScreen navigate={navigate} />}
              {screen==="home"             && <HomeScreen navigate={navigate} />}
              {screen==="voice"            && <VoiceScreen navigate={navigate} />}
              {screen==="routes"           && <RoutesScreen navigate={navigate} />}
              {screen==="routeDetail"      && <RouteDetailScreen navigate={navigate} />}
              {screen==="wageGuardian"     && <WageGuardianScreen navigate={navigate} />}
              {screen==="safety"           && <SafetyScreen navigate={navigate} />}
              {screen==="safeCompanion"    && <SafeCompanionScreen navigate={navigate} />}
              {screen==="womenScore"       && <WomenScoreScreen navigate={navigate} />}
              {screen==="sos"              && <SOSScreen navigate={navigate} />}
              {screen==="profile"          && <ProfileScreen navigate={navigate} />}
            </motion.div>
          </AnimatePresence>
        </div>
        {!noBottomNav.includes(screen) && <BottomNav active={activeNav} navigate={navigate} />}
      </div>
    </div>
  );
}

export function CommuteSaathiApp() {
  return (
    <AuthProvider>
      <AppStateProvider>
        <LanguageProvider>
          <CommuteStoreProvider>
            <CommuteSaathiAppInner />
          </CommuteStoreProvider>
        </LanguageProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}
