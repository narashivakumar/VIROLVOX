
export interface NicheCategory {
  name: string;
  subNiches: string[];
}

export const NICHE_CATEGORIES: NicheCategory[] = [
  {
    name: "💰 FINANCE & MONEY",
    subNiches: [
      "Personal finance tips", "Stock market basics", "Crypto education",
      "Passive income ideas", "Side hustles", "Real estate investing",
      "Budgeting for beginners", "Credit cards & loans", "Mutual funds explained",
      "Online business ideas"
    ]
  },
  {
    name: "📚 EDUCATION & SKILLS",
    subNiches: [
      "Exam preparation", "Spoken English", "Coding tutorials",
      "AI tools & prompts", "Career guidance", "Resume & interview tips",
      "Study hacks", "Freelancing skills", "Online course reviews",
      "Productivity systems"
    ]
  },
  {
    name: "🧠 SELF-IMPROVEMENT",
    subNiches: [
      "Daily motivation", "Discipline & habits", "Success stories",
      "Mindset training", "Confidence building", "Goal setting",
      "Mental clarity", "Stress management", "Time management",
      "Book summaries"
    ]
  },
  {
    name: "🧘 HEALTH & WELLNESS",
    subNiches: [
      "Weight loss tips", "Home workouts", "Yoga for beginners",
      "Meditation guides", "Mental health awareness", "Healthy recipes",
      "Ayurveda tips", "Fitness challenges", "Sleep improvement",
      "Posture & pain relief"
    ]
  },
  {
    name: "🙏 SPIRITUALITY",
    subNiches: [
      "Mythological stories", "Temple history", "Spiritual symbolism",
      "Mantra explanations", "Daily bhakti shorts", "Astrology basics",
      "Vastu tips", "Life lessons from gods", "Festivals explained",
      "Moral stories"
    ]
  },
  {
    name: "🎮 GAMING & ESPORTS",
    subNiches: [
      "Mobile game tips", "PC game walkthroughs", "Gaming shorts",
      "Game lore explained", "Esports news", "Game reviews",
      "Streaming highlights", "Speedruns", "Retro gaming",
      "Gaming setup guides"
    ]
  },
  {
    name: "🍔 FOOD & COOKING",
    subNiches: [
      "Street food videos", "Home cooking recipes", "Healthy cooking",
      "Budget meals", "Regional cuisine", "ASMR cooking",
      "Food challenges", "Restaurant reviews", "Baking tutorials",
      "Meal prep"
    ]
  },
  {
    name: "✈️ TRAVEL & LOCAL",
    subNiches: [
      "Budget travel", "Village life vlogs", "Temple travel guides",
      "Hidden places", "Train journey vlogs", "Travel hacks",
      "Food travel", "Solo travel", "Cultural exploration",
      "Travel shorts"
    ]
  },
  {
    name: "👗 LIFESTYLE & BEAUTY",
    subNiches: [
      "Daily routines", "Minimalist lifestyle", "Grooming tips",
      "Fashion styling", "Beauty tutorials", "Skincare routines",
      "Haircare tips", "Sustainable living", "Luxury lifestyle",
      "Product hauls"
    ]
  },
  {
    name: "🤖 TECH & AI",
    subNiches: [
      "Smartphone reviews", "AI tools tutorials", "App reviews",
      "Tech news explained", "Gadgets under budget", "YouTube growth tips",
      "Automation tools", "Software comparisons", "Online tools reviews",
      "Future tech trends"
    ]
  }
];
