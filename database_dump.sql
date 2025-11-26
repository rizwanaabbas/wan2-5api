-- VideoForge Database Dump
-- Generated: 2025-11-25
-- PostgreSQL Database

-- ===========================================
-- TABLE: users
-- ===========================================
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO users (id, email, password, created_at) VALUES
('8b62499a-fdb6-4edc-9dbd-6245bcd5c440', 'rizwanaabbas@gmail.com', 'c7ef9af77ac373d7752951c235538a64:2189067544a8b798d73f4a706bae0a1be2bec060b0539fc458c6c1d4474d1f552f384ce6d29f8b2c83064672d1049b53dea91a732c2d60ca01d7225234bf8b5b', '2025-11-25 10:48:55.52547'),
('930fbf6f-96da-4d63-891c-10c4045f841b', 'rabanasaeed@gmail.com', 'c0495df410b85ce661276ec0e7262832:807fffb06aa036a5890d662cf6e6050cd71bcb11e0465ddde533609a0df42533c5c6688d84fec46d309c6c3281bf340c2669ebf8632403a275e4b10f97e76ece', '2025-11-25 10:48:55.667057');

-- ===========================================
-- TABLE: projects
-- ===========================================
DROP TABLE IF EXISTS projects CASCADE;
CREATE TABLE projects (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    global_prompt TEXT,
    image_url TEXT,
    default_model TEXT
);

INSERT INTO projects (id, name, created_at, global_prompt, image_url, default_model) VALUES
('89b979f0-e565-47b9-81c4-f4e0f31f6a25', 'Yummy in my Tummy', '2025-11-07 07:56:40.747606', '3D cartoon nursery rhyme animation, gentle and bouncy like "Yes Yes Vegetables Song" (90–100 BPM).
Main characters: Asian Pakistani Mom (slim fair white skin tone, smiling, wearing pastel pink dress with white apron, big round brown eyes, CoComelon-style proportions) and Child/Baby (3 years old Asian Pakistani girl , fair white skin tone, curly brown hair, big round dark brown eyes, wearing light-blue onesie).
Consistent look across all scenes — same characters, outfits, hair, facial proportions, and props.
Props: one colorful bowl and one yellow spoon with a smiling face — same design in every scene.
Environment: bright pastel kitchen or playroom, soft daylight lighting, warm pastel palette (peach, sky blue, mint, yellow).
Animation style: slow, expressive, rounded facial features, smooth movements, soft depth of field.
Camera: gentle motion, rhythmic cuts synced to 90–100 BPM beat.
Render in high-quality CoComelon-style 3D.', NULL, NULL),
('99a40e9e-e79a-4d29-9f13-2766a3075d90', 'opening scene', '2025-11-12 09:56:38.860567', 'A vibrant, heartwarming 3D cartoon intro scene inspired by CoComelon and Pixar, featuring the family from the reference image — the "Bittu and Family" characters. The camera begins with a slow pan over a sunny suburban neighborhood filled with colorful houses, green lawns, and bright morning light. Gentle, playful music plays in the background.

As the camera glides toward the family''s home, the door opens and the Bittu family happily steps outside, waving at the audience.

Mom: slim, fair skin, pastel pink dress with a white apron, big round brown eyes, warm smile.

Dad: slim, bald, short beard, round friendly face, wearing a sky-blue shirt.

Bittu (3-year-old girl): curly brown hair, big expressive dark brown eyes, wearing a light-blue onesie, smiling and waving.

Baby boy (1 year old): fair skin, straight light-brown hair, bright eyes, holding a small toy, giggling.

They stand together in front of their cheerful cartoon house with flowers, trees, and pastel clouds in the sky.
A rainbow appears above the family as colorful confetti floats in the air. The title "Bittu and Family" appears in shiny 3D bubble letters with a gentle sparkle animation.

As the camera slowly zooms out, cheerful children''s voices sing "Bittu and Family!" in a joyful tune, accompanied by ukulele and light percussion. The scene ends with the family waving and a little sparkle sound effect.

Style:
Pixar / CoComelon hybrid style, vivid 3D lighting, soft materials, glossy eyes, warm ambient color palette, cinematic lens depth, UHD 4K render.

Audio Description (for T2V):

Music: upbeat ukulele, soft percussion, gentle melody.

Voices: happy children''s chorus singing "Bittu and Family!"

SFX: sparkle chime, birds chirping, joyful laughter.', NULL, NULL),
('7aa8f6ab-da7a-40ff-ba43-94ed8873b11a', 'Wheels on the bus', '2025-11-14 07:03:34.185134', NULL, NULL, NULL),
('7a4cdeef-d5bb-474a-9be3-b6e5c8b20ba0', 'Hungry Baby', '2025-11-15 20:16:24.414346', NULL, NULL, NULL),
('d86d4ded-8639-40c2-ad8a-c0299a6c5c09', 'Logo & Welcome Video', '2025-11-17 18:25:34.750352', NULL, NULL, NULL),
('dd423689-69db-41c9-a32a-6e63a6e2473a', 'Image Upload Test zZBP5a', '2025-11-20 19:25:39.3124', NULL, NULL, NULL),
('b55f1ba8-75fe-4854-a269-8a7cb4ded0a6', 'Audio Filename Test oH-9Vm', '2025-11-20 19:27:31.613496', NULL, NULL, NULL),
('ec27bb05-3a09-401f-ba9d-4f1f3d9fa296', 'Persistence Test gO16fu', '2025-11-20 19:31:56.698217', NULL, NULL, NULL),
('f549b06a-5019-4e02-95d7-912556f7d4d4', 'Image Test C2d9YP', '2025-11-20 19:33:49.593862', NULL, NULL, NULL),
('b8ebf6bd-2cab-4db0-bc33-5f21d9b1092c', 'Test wan 2.2 v2', '2025-11-22 16:49:42.312311', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/9dac6074-d087-4b93-9332-c5857625b310', 'wan2.2-i2v-plus'),
('964f77b9-fae1-41ed-a159-1c062a3224dd', 'ABC Song', '2025-11-23 19:34:47.686279', 'Overall Style: High-quality 3D animation that seamlessly integrates your provided 2D character images into a 3D world. The environment, letters, and fruits will be fully 3D with Pixar-style textures and lighting, creating a dynamic "pop-up book" effect. The provided images of Blue Baby Shark and Baby Boy Aymo will be consistently used as the core visual elements for these characters in every scene.

Main Characters (From Your Provided Images):

Blue Baby Shark: His provided image will be integrated to swim, bounce, and move through the 3D environments.

Baby Boy Aymo (1-year-old): His provided image will be the base for all his appearances, animated to sing, dance, and interact.

Animated Elements (3D):

Animated Letters & Produce: Each letter and fruit/vegetable will be 3D with simple, friendly faces, allowing them to emote and chant along.

Core Mechanic: In every verse, the provided image of Baby Boy Aymo will be animated to sing the main line, while the 3D Animated Fruit and Letter bounce and chant the "doo-doo-doo-doo-doo-doo" in unison. Blue Baby Shark''s image will be animated to be his constant companion.', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/728f5408-1ace-4673-b625-5fa9a1dae636', 'wan2.5-i2v-preview'),
('2f0ee1dd-048e-4bf5-a582-7061fba9737e', 'Squish squish squish—it''s slime time!', '2025-11-19 09:14:03.788516', 'Overall Style: Soft, Pixar/DreamWorks-style 3D animation. Characters have expressive, rounded features and smooth, fluid movements. Lighting is warm and diffused, creating ultra-soft shadows. Gentle depth of field is used throughout to focus on the action. Colors are bright, saturated, and pastel-based.', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/9c05448d-d57b-495b-8c85-49bf0212ba97', 'wan2.5-i2v-preview'),
('36ba474b-1f68-482a-b70b-e66b1aa9cc79', 'Upload Test ZZbYIF', '2025-11-20 19:18:30.372426', NULL, NULL, NULL),
('fc33f507-227e-44f7-bf5a-1bc98261ede2', 'Audio Test lH5CMt', '2025-11-20 19:20:06.57859', NULL, NULL, NULL),
('8492a89b-7ee5-4347-b766-bca107a050fd', 'ABC song v2', '2025-11-23 19:53:43.010938', 'Overall Style: Bright, vibrant 3D animation in the style of "3D Baby Shark." Clean, colorful, and friendly. Features two main characters: 3D Baby Boy and Baby Shark (a friendly, smiling cartoon shark). They appear in every scene, interacting with each produce item.', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/a1430a85-cf79-41a1-96f4-b619406e3d1c', 'wan2.5-i2v-preview');

-- ===========================================
-- TABLE: videos
-- ===========================================
DROP TABLE IF EXISTS videos CASCADE;
CREATE TABLE videos (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    generation_type TEXT NOT NULL,
    resolution TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    video_url TEXT,
    thumbnail_url TEXT,
    source_image_url TEXT,
    duration INTEGER,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    negative_prompt TEXT,
    task_id TEXT,
    audio_mode TEXT DEFAULT 'auto',
    audio_url TEXT,
    first_keyframe_url TEXT,
    last_keyframe_url TEXT,
    audio_filename TEXT
);

INSERT INTO videos (id, project_id, name, prompt, model, generation_type, resolution, status, progress, video_url, thumbnail_url, source_image_url, duration, error_message, created_at, negative_prompt, task_id, audio_mode, audio_url, first_keyframe_url, last_keyframe_url, audio_filename) VALUES
('50e1cc2f-d535-4011-8292-ec456a1ffa3a', '2f0ee1dd-048e-4bf5-a582-7061fba9737e', 'scene 2 - the stage', 'Scene 5: The Grand Entrance

Action: The baby girl, now in a sparkling (but soft-textured) outfit, strikes a confident pose. She holds a microphone generously coated in glowing pink slime. A single, soft spotlight hits her.

Backdrop: Dark blue stage with a subtle starry night sky and slow-moving, softly glowing neon clouds.

Dance Move: One hand on her hip, the other raising the slime-covered mic to her lips.

Style Execution: The spotlight has a soft bloom effect. The slime on the mic has a glossy, juicy texture with soft subsurface scattering. Overall Style: Soft, Pixar/DreamWorks-style 3D animation. Characters have expressive, rounded features and smooth, fluid movements. Lighting is warm and diffused, creating ultra-soft shadows. Gentle depth of field is used throughout to focus on the action. Colors are bright, saturated, and pastel-based.', 'wan2.5-i2v-preview', 'image-to-video', '1920x1080', 'completed', 100, '/objects/uploads/959ac8b7-a660-49a4-a452-d112154acd8b', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/543884e6-65db-45a6-bbf9-732f4fbf4649', 8, NULL, '2025-11-19 20:17:37.421469', NULL, 'ceb1975d-d518-43bb-8f4a-04291f13fb53', 'custom', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/89d47b4d-b414-4a9d-bddd-675d6dbc15b1', NULL, NULL, NULL),
('29200877-afea-4cbc-9ebd-567036d8abd2', '2f0ee1dd-048e-4bf5-a582-7061fba9737e', 'Scene 1 -2', 'Overall Style: Soft, Pixar/DreamWorks-style 3D animation. Bright pastel nursery with clouds, toys, and a dresser. Warm, diffused sunlight with ultra-soft shadows and gentle depth of field for a cozy, plush atmosphere.


Shot 2: Brother''s Entrance

Character: 3D Baby Boy (Aymo) alone

Action: Standing in the fully open doorway with a happy, playful expression. He hears his sister, smiles, and eagerly walks into the room.

Camera: Static wide shot, focused on Aymo in the doorway. Style & Atmosphere: Soft 3D animated style, Pixar/DreamWorks-inspired character rendering. Bright pastel nursery with clouds, toys, and a dresser. Warm, diffused sunlight creates a cozy, plush mood with ultra-soft shadows. Gentle depth of field.', 'wan2.5-i2v-preview', 'image-to-video', '1920x1080', 'completed', 100, '/objects/uploads/32a5cdb3-0eee-4d3f-a698-d60903a769b8', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/abd0a921-4107-4d09-97d8-bf5e86bacd22', 8, NULL, '2025-11-19 12:14:48.609624', NULL, '5c06c433-605d-4097-bfaa-20c90bb47f3c', 'auto', NULL, NULL, NULL, NULL),
('66ec5413-38ac-499c-b7df-b4ffd63fefc4', '2f0ee1dd-048e-4bf5-a582-7061fba9737e', 'scene 2 - retake', 'Scene 5: The Grand Entrance

Action: The baby girl, now in a sparkling (but soft-textured) outfit, strikes a confident pose. She holds a microphone generously coated in glowing pink slime. A single, soft spotlight hits her.

Backdrop: Dark blue stage with a subtle starry night sky and slow-moving, softly glowing neon clouds.

Dance Move: One hand on her hip, the other raising the slime-covered mic to her lips.

Style Execution: The spotlight has a soft bloom effect. The slime on the mic has a glossy, juicy texture with soft subsurface scattering. Overall Style: Soft, Pixar/DreamWorks-style 3D animation. Characters have expressive, rounded features and smooth, fluid movements. Lighting is warm and diffused, creating ultra-soft shadows. Gentle depth of field is used throughout to focus on the action. Colors are bright, saturated, and pastel-based.', 'wan2.5-i2v-preview', 'image-to-video', '1920x1080', 'completed', 100, '/objects/uploads/9dd2641c-fe22-4908-8c64-8d031e44c9b3', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/18ef11cf-bbc8-404e-83e2-dc9e085495d9', 8, NULL, '2025-11-19 20:24:41.152061', NULL, '2fb0aa83-c86a-4f84-bc7e-71f2e6984ae1', 'custom', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/876bffb0-3f51-4035-85a3-bd251adba7f2', NULL, NULL, NULL),
('aecb3cb2-fe13-4946-afcc-8ec70bde3713', '2f0ee1dd-048e-4bf5-a582-7061fba9737e', 'scene 3', 'Scene 6: Explosion of Color & Dance
Action:
The beat drops! The baby girl launches into a energetic dance sequence. She performs a mid-air jumping jack, singing joyfully with unmatched energy. As she jumps, a large glob of green slime slips from her microphone, twirling through the air in a weighty, believable arc. Simultaneously, yellow slime flies off her spinning dress. She lands and transitions into a series of quick, bouncy "pogo" jumps, shaking her shoulders to the rhythm, causing more tiny slime droplets to flick off her. Throughout her moves, she vigorously shakes the microphone, clearing the last of the sticky slime from it, now holding it clean and ready.

Backdrop:
A vibrant burst of dynamic, rotating rainbow circles and exploding geometric shapes, all rendered in soft, cheerful pastel tones.

Dance Moves:

A high "jumping jack" in mid-air, legs kicked out to the sides, arms spreading wide.

Lands and transitions into quick, bouncy "pogo" jumps on the spot.

A sharp, playful shoulder shimmy.

Style Execution:
The flying slime has a thick, viscous quality, with a glossy, juicy texture. The exploding shapes in the backdrop are not sharp but have rounded, friendly edges, maintaining the soft, Pixar-style aesthetic. The character''s movements are fluid and full of joyful, exaggerated energy. Overall Style: Soft, Pixar/DreamWorks-style 3D animation. Characters have expressive, rounded features and smooth, fluid movements. Lighting is warm and diffused, creating ultra-soft shadows. Gentle depth of field is used throughout to focus on the action. Colors are bright, saturated, and pastel-based.', 'wan2.5-i2v-preview', 'image-to-video', '1920x1080', 'completed', 100, '/objects/uploads/873ebcac-fd62-48ae-9b95-bc2f1bc8a872', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/ea7e6ad6-32da-4308-a047-874f8760eb31', 8, NULL, '2025-11-19 20:32:03.326114', NULL, 'ce22094d-b40d-424f-bed4-ed23fe43e780', 'custom', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/b44b93d3-93c4-440c-bb3a-7eb63806cda1', NULL, NULL, NULL),
('5e8e37c2-2f0a-43e9-b237-581163e86b70', '7aa8f6ab-da7a-40ff-ba43-94ed8873b11a', 'Scene 1 - Bus rolls in', 'A bright, sunny morning in a colorful, cheerful cartoon town. Warm sunlight, soft shadows, pastel houses, blooming flowers, and gently swaying trees. A large 3D yellow cartoon school bus approaches from the distance on a curved road. The driver sits in the front seat holding the steering wheel and smiling warmly. "Bittu and Family" characters stand on the sidewalk waving excitedly to stop the bus. Cute 3D Pixar/CoComelon style.
Animation: Bus driving forward, light tire rotation, soft character waving, hair and clothes gently moving.
Camera: Smooth forward tracking shot toward the bus and family.
Emotion: Happy, welcoming, bright.', 'wan2.5-i2v-preview', 'image-to-video', '1280x720', 'completed', 100, 'https://dashscope-result-sgp.oss-ap-southeast-1.aliyuncs.com/1d/6a/20251114/30b07d9c/49090582-2a343b28-d5f9-46b7-b964-2df319af3498.mp4?Expires=1763209971&OSSAccessKeyId=LTAI5tBLUzt9WaK89DU8aECd&Signature=uW%2BnrUQnxpxYKbb57%2Bx2iG0Tofo%3D', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/a2e29d84-579e-44de-a997-9d4a00cccacc', 8, NULL, '2025-11-14 12:29:59.941948', NULL, '2a343b28-d5f9-46b7-b964-2df319af3498', 'custom', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/fbeee479-174d-44ff-b31c-b5f5dbddbf7f', NULL, NULL, NULL),
('7f47a4b5-e840-42f7-84de-f68b25c1d777', '7a4cdeef-d5bb-474a-9be3-b6e5c8b20ba0', 'Ending scene 5 Remake', '3D Mama holding a baby softly gently focusing on camera. Baby boy and mama waving bye to everyone and focusing on camera . Bright pastel nursery with clouds, toys, dresser, warm sunlight. Close-up shot with slow, gentle camera push. CoComelon/Pixar style.', 'wan2.5-i2v-preview', 'image-to-video', '1920x1080', 'completed', 100, 'https://dashscope-result-sgp.oss-ap-southeast-1.aliyuncs.com/1d/46/20251117/30b07d9c/64016033-5ccf524f-0e29-43c8-8cb3-9512acce404d.mp4?Expires=1763471372&OSSAccessKeyId=LTAI5tBLUzt9WaK89DU8aECd&Signature=LKgntt5DXdOZ%2Bm6W2qMX0REuuOo%3D', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/f3dcb254-fac0-463f-98f9-ff77892ae136', 8, NULL, '2025-11-17 13:06:47.646137', NULL, '5ccf524f-0e29-43c8-8cb3-9512acce404d', 'custom', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/8f0760fa-11d1-4079-9383-311431d21397', NULL, NULL, NULL),
('f38559ca-f2bb-407f-a4ac-145bbb79707c', '89b979f0-e565-47b9-81c4-f4e0f31f6a25', 'Scene 1', '3D cartoon nursery rhyme animation, gentle and bouncy like "Yes Yes Vegetables Song" (90–100 BPM).
Main characters: Asian Pakistani Mom (slim fair white skin tone, smiling, wearing pastel pink dress with white apron, big round brown eyes, CoComelon-style proportions) and Child/Baby (3 years old Asian Pakistani girl , fair white skin tone, curly brown hair, big round dark brown eyes, wearing light-blue onesie).
Consistent look across all scenes — same characters, outfits, hair, facial proportions, and props.
Props: one colorful bowl and one yellow spoon with a smiling face — same design in every scene.
Environment: bright pastel kitchen or playroom, soft daylight lighting, warm pastel palette (peach, sky blue, mint, yellow).
Animation style: slow, expressive, rounded facial features, smooth movements, soft depth of field.
Camera: gentle motion, rhythmic cuts synced to 90–100 BPM beat.
Render in high-quality CoComelon-style 3D.  Scene Action: Mom brings a colorful bowl and smiling yellow spoon toward Baby in the high chair. Baby crosses arms and shakes head playfully saying "No no no!"
Mom smiles kindly, tilts head, softly encouraging.
Camera slowly zooms in on Baby''s expressive face while pastel kitchen glows warmly.', 'wan2.1', 'text-to-video', '1280x720', 'completed', 100, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', NULL, NULL, 5, NULL, '2025-11-07 07:59:36.522926', NULL, NULL, 'auto', NULL, NULL, NULL, NULL),
('8a6fc8b9-8457-49d4-be35-7baacbd327d5', '89b979f0-e565-47b9-81c4-f4e0f31f6a25', 'scene 2', 'Scene Action: Mom gently takes a pretend bite from the spoon, says "Mmm, yummy!" Baby watches curiously with wide eyes.
Add dancing cartoon vegetables on the table.
Camera side-angle showing both faces.
Gentle bounce in rhythm to the song.', 'ovi', 'text-to-video', '720x720', 'failed', 0, NULL, NULL, NULL, NULL, 'No video URL returned from Veo3', '2025-11-07 10:53:56.969783', NULL, NULL, 'auto', NULL, NULL, NULL, NULL),
('0eebac17-3862-4ed7-b120-482dc57c299e', '7a4cdeef-d5bb-474a-9be3-b6e5c8b20ba0', 'Scene 1', 'A 3D cute baby boy sitting on a colorful playmat, holding his tummy as it makes a funny "rumble rumble" vibration. Soft squash-and-stretch animation. Big expressive eyes open wide in surprise. Bright CoComelon-style nursery room with toys, pastel colors, warm morning lighting. Camera medium close-up, gentle camera shake to match tummy rumble.', 'wan2.5-i2v-preview', 'image-to-video', '1920x1080', 'completed', 100, 'https://dashscope-result-sgp.oss-ap-southeast-1.aliyuncs.com/1d/d0/20251116/30b07d9c/5603972-7f8b8e85-aa74-4b01-87da-adfb66e5bf05.mp4?Expires=1763325497&OSSAccessKeyId=LTAI5tBLUzt9WaK89DU8aECd&Signature=D0ZoRLyvpA%2BeEjjxbHVmfie9lNg%3D', NULL, 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/c8363b23-83a8-4a12-b350-30d72bda0ee3', 8, NULL, '2025-11-15 20:35:30.555859', NULL, '7f8b8e85-aa74-4b01-87da-adfb66e5bf05', 'custom', 'https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/d5ec3662-7239-4a6b-bed6-1dd6e27618fb', NULL, NULL, NULL),
('7a82cdba-d414-4c99-9480-ffa8cd27f5e7', '99a40e9e-e79a-4d29-9f13-2766a3075d90', 'Opening scene', 'A vibrant, heartwarming 3D cartoon intro scene inspired by CoComelon and Pixar, featuring the family from the reference image — the "Bittu and Family" characters. The camera begins with a slow pan over a sunny suburban neighborhood filled with colorful houses, green lawns, and bright morning light. Gentle, playful music plays in the background.

As the camera glides toward the family''s home, the door opens and the Bittu family happily steps outside, waving at the audience.

Mom: slim, fair skin, pastel pink dress with a white apron, big round brown eyes, warm smile.

Dad: slim, bald, short beard, round friendly face, wearing a sky-blue shirt.

Bittu (3-year-old girl): curly brown hair, big expressive dark brown eyes, wearing a light-blue onesie, smiling and waving.

Baby boy (1 year old): fair skin, straight light-brown hair, bright eyes, holding a small toy, giggling.

They stand together in front of their cheerful cartoon house with flowers, trees, and pastel clouds in the sky.
A rainbow appears above the family as colorful confetti floats in the air. The title "Bittu and Family" appears in shiny 3D bubble letters with a gentle sparkle animation.

As the camera slowly zooms out, cheerful children''s voices sing "Bittu and Family!" in a joyful tune, accompanied by ukulele and light percussion. The scene ends with the family waving and a little sparkle sound effect.

Style:
Pixar / CoComelon hybrid style, vivid 3D lighting, soft materials, glossy eyes, warm ambient color palette, cinematic lens depth, UHD 4K render.

Audio Description (for T2V):

Music: upbeat ukulele, soft percussion, gentle melody.

Voices: happy children''s chorus singing "Bittu and Family!"

SFX: sparkle chime, birds chirping, joyful laughter.', 'wan2.1', 'text-to-video', '720x720', 'failed', 0, NULL, NULL, NULL, NULL, 'DASHSCOPE_API_KEY not configured. Please add your DashScope API key.', '2025-11-12 09:57:33.183464', NULL, NULL, 'auto', NULL, NULL, NULL, NULL);

-- ===========================================
-- TABLE: storyboards
-- ===========================================
DROP TABLE IF EXISTS storyboards CASCADE;
CREATE TABLE storyboards (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    generation_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO storyboards (id, project_id, name, generation_type, created_at) VALUES
('b65091f8-e717-4e09-bf02-d3430d002dec', '8492a89b-7ee5-4347-b766-bca107a050fd', 'ABC song', 'i2i', '2025-11-25 12:40:13.003815');

-- ===========================================
-- TABLE: storyboard_images
-- ===========================================
DROP TABLE IF EXISTS storyboard_images CASCADE;
CREATE TABLE storyboard_images (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
    storyboard_id VARCHAR(255) NOT NULL REFERENCES storyboards(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    source_images TEXT,
    generated_image_url TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO storyboard_images (id, storyboard_id, prompt, source_images, generated_image_url, "order", created_at) VALUES
('1796c424-d895-42ec-ba89-1cb7065b12c1', 'b65091f8-e717-4e09-bf02-d3430d002dec', 'Style: Pixar/DreamWorks-style 3D animation, bright kids-cartoon look
Characters:

Baby Boy (from reference image)

Baby Shark (from reference image)

Environment:
Sunny orchard, soft green grass, colorful trees, wooden picket fence, warm daylight, soft shadows, playful mood. Overall Style: Bright, vibrant 3D animation in the style of "3D Baby Shark." Clean, colorful, and friendly. Features two main characters: 3D Baby Boy and Baby Shark (a friendly, smiling cartoon shark). They appear in every scene, interacting with each produce item.', '["https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/ddf3e401-9126-4a2f-835d-fc842efd853b","https://0c0283fb-1a31-4832-ab90-bc40d396e0d1-00-2bpj37hig25s0.picard.replit.dev/objects/uploads/a167360e-5fb2-4cec-866e-3ad782494fa6"]', 'https://dashscope-result-sgp.oss-ap-southeast-1.aliyuncs.com/1d/4c/20251125/ee1ffd0b/51396321-3722d947-7b24-423e-81d1-21c3e7813ac3.png?Expires=1764160660&OSSAccessKeyId=LTAI5tBLUzt9WaK89DU8aECd&Signature=fsrl8MSEw8D8iYCjzOn0deV3VM0%3D', 0, '2025-11-25 12:40:14.007972');

-- ===========================================
-- INDEXES (for performance)
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_project_id ON storyboards(project_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_images_storyboard_id ON storyboard_images(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
