export interface ModelDefinition {
  id: string;
  name: string;
  type: string;
  speed: string;
  quality: string;
  cost: string;
  bestUseCase: string;
  category: "text-to-video" | "image-to-video" | "text-to-image" | "image-to-image" | "animation" | "keyframe";
  supportsImage?: boolean;
  supportsAudio?: boolean;
  supportsDuration?: boolean;
  supportsKeyframes?: boolean;
}

export const WAN_MODELS: Record<string, ModelDefinition> = {
  "wan2.2-animate-mix": {
    id: "wan2.2-animate-mix",
    name: "Wan 2.2 Animate Mix",
    type: "Character replacement",
    speed: "Fast",
    quality: "Good",
    cost: "Low",
    bestUseCase: "Replace a person/character in a video clip with another (simple motion retargeting).",
    category: "animation",
    supportsImage: true,
  },
  "wan2.2-animate-move": {
    id: "wan2.2-animate-move",
    name: "Wan 2.2 Animate Move",
    type: "Character animation from still",
    speed: "Very Fast",
    quality: "Decent",
    cost: "Low",
    bestUseCase: "Animate static characters with walking/waving etc. (simple short clips).",
    category: "animation",
    supportsImage: true,
  },
  "wan2.5-t2v-preview": {
    id: "wan2.5-t2v-preview",
    name: "Wan 2.5 T2V Preview",
    type: "Text-to-Video (latest preview)",
    speed: "Medium",
    quality: "High",
    cost: "Medium-High",
    bestUseCase: "Highest quality natural motion from text; more cinematic, slower & pricier.",
    category: "text-to-video",
    supportsAudio: true,
    supportsDuration: true,
  },
  "wan2.5-i2v-preview": {
    id: "wan2.5-i2v-preview",
    name: "Wan 2.5 I2V Preview",
    type: "Image-to-Video (latest preview)",
    speed: "Medium",
    quality: "High",
    cost: "Medium-High",
    bestUseCase: "Turn one image into a smooth video; better motion realism than 2.2-Plus.",
    category: "image-to-video",
    supportsImage: true,
    supportsAudio: true,
    supportsDuration: true,
  },
  "wan2.5-t2i-preview": {
    id: "wan2.5-t2i-preview",
    name: "Wan 2.5 T2I Preview",
    type: "Text-to-Image",
    speed: "Fast",
    quality: "High",
    cost: "Low",
    bestUseCase: "Best for generating still frames, concept art.",
    category: "text-to-image",
  },
  "wan2.5-i2i-preview": {
    id: "wan2.5-i2i-preview",
    name: "Wan 2.5 I2I Preview",
    type: "Image Edit",
    speed: "Fast",
    quality: "High",
    cost: "Low",
    bestUseCase: "Modify or enhance images with high fidelity.",
    category: "image-to-image",
    supportsImage: true,
  },
  "wan2.2-i2v-flash": {
    id: "wan2.2-i2v-flash",
    name: "Wan 2.2 I2V Flash",
    type: "Image-to-Video",
    speed: "Very Fast",
    quality: "Medium",
    cost: "Lowest",
    bestUseCase: "Super quick motion preview; best for drafts or fast animation.",
    category: "image-to-video",
    supportsImage: true,
  },
  "wan2.2-i2v-plus": {
    id: "wan2.2-i2v-plus",
    name: "Wan 2.2 I2V Plus",
    type: "Image-to-Video",
    speed: "Medium",
    quality: "Better",
    cost: "Medium",
    bestUseCase: "Higher quality than Flash, slower render.",
    category: "image-to-video",
    supportsImage: true,
  },
  "wan2.2-t2v-plus": {
    id: "wan2.2-t2v-plus",
    name: "Wan 2.2 T2V Plus",
    type: "Text-to-Video",
    speed: "Medium",
    quality: "Better",
    cost: "Medium",
    bestUseCase: "Balanced option for short text-to-video clips (cheaper than 2.5).",
    category: "text-to-video",
    supportsAudio: true,
  },
  "wan2.2-t2i-plus": {
    id: "wan2.2-t2i-plus",
    name: "Wan 2.2 T2I Plus",
    type: "Text-to-Image",
    speed: "Fast",
    quality: "Great",
    cost: "Low",
    bestUseCase: "Rich image detail, great for prompt-based frame generation.",
    category: "text-to-image",
  },
  "wan2.2-t2i-flash": {
    id: "wan2.2-t2i-flash",
    name: "Wan 2.2 T2I Flash",
    type: "Text-to-Image",
    speed: "Very Fast",
    quality: "Slightly lower",
    cost: "Lowest",
    bestUseCase: "Quick idea sketches and thumbnails.",
    category: "text-to-image",
  },
  "wan2.1-vace-plus": {
    id: "wan2.1-vace-plus",
    name: "Wan 2.1 VACE Plus",
    type: "All-in-One (I2V, T2V, editing)",
    speed: "Medium",
    quality: "Good",
    cost: "Medium",
    bestUseCase: "Multi-input creative workflow.",
    category: "image-to-video",
    supportsImage: true,
  },
  "wan2.1-kf2v-plus": {
    id: "wan2.1-kf2v-plus",
    name: "Wan 2.1 KF2V Plus",
    type: "Keyframe-to-Video",
    speed: "Medium",
    quality: "Smooth transitions",
    cost: "Medium",
    bestUseCase: "Animate from first+last frame into smooth motion.",
    category: "keyframe",
    supportsImage: true,
    supportsKeyframes: true,
  },
};

export const MODEL_CATEGORIES = {
  "text-to-video": "Text to Video",
  "image-to-video": "Image to Video",
  "text-to-image": "Text to Image",
  "image-to-image": "Image to Image",
  "animation": "Character Animation",
  "keyframe": "Keyframe Animation",
} as const;

export function getModelsByCategory() {
  const grouped: Record<string, ModelDefinition[]> = {};
  
  Object.values(WAN_MODELS).forEach(model => {
    if (!grouped[model.category]) {
      grouped[model.category] = [];
    }
    grouped[model.category].push(model);
  });
  
  return grouped;
}
