// Bundled exercise catalog seeded from the free-exercise-db dataset
// (https://github.com/yuhonas/free-exercise-db, public domain / Unlicense).
// Regenerate with the catalog builder; images live in static/exercise-assets/.

export interface BuiltInExercise {
	key: string;
	name: string;
	muscleGroup: string;
	secondaryMuscles: string[];
	equipment: string;
	category: string;
	description: string;
	imageUrls: string[];
}

export const BUILTIN_EXERCISES: BuiltInExercise[] = [
	{
		key: 'barbell_bench_press_medium_grip',
		name: 'Barbell Bench Press - Medium Grip',
		muscleGroup: 'chest',
		secondaryMuscles: ['shoulders', 'triceps'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Lie back on a flat bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position. From the starting position, breathe in and begin coming down slowly until the bar touches your middle chest. After a brief pause, push the bar back to the starting position as you breathe out. Focus on pushing the bar using your chest muscles. Lock your arms and squeeze your chest in the contracted position at the top ',
		imageUrls: [
			'/exercise-assets/barbell_bench_press_medium_grip/0.webp',
			'/exercise-assets/barbell_bench_press_medium_grip/1.webp'
		]
	},
	{
		key: 'dumbbell_bench_press',
		name: 'Dumbbell Bench Press',
		muscleGroup: 'chest',
		secondaryMuscles: ['shoulders', 'triceps'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Lie down on a flat bench with a dumbbell in each hand resting on top of your thighs. The palms of your hands will be facing each other. Then, using your thighs to help raise the dumbbells up, lift the dumbbells one at a time so that you can hold them in front of you at shoulder width. Once at shoulder width, rotate your wrists forward so that the palms of your hands are facing away from you. The dumbbells should be just to the sides of your chest, with your upper arm and forearm creating a 90 degree angle. Be sure to maintain full control of the dumbbells at all times. This will be your starti',
		imageUrls: [
			'/exercise-assets/dumbbell_bench_press/0.webp',
			'/exercise-assets/dumbbell_bench_press/1.webp'
		]
	},
	{
		key: 'barbell_incline_bench_press_medium_grip',
		name: 'Barbell Incline Bench Press - Medium Grip',
		muscleGroup: 'chest',
		secondaryMuscles: ['shoulders', 'triceps'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Lie back on an incline bench. Using a medium-width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position. As you breathe in, come down slowly until you feel the bar on you upper chest. After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your chest muscles. Lock your arms in the contracted position, squeeze your chest, hold for a second and then start coming down s',
		imageUrls: [
			'/exercise-assets/barbell_incline_bench_press_medium_grip/0.webp',
			'/exercise-assets/barbell_incline_bench_press_medium_grip/1.webp'
		]
	},
	{
		key: 'decline_barbell_bench_press',
		name: 'Decline Barbell Bench Press',
		muscleGroup: 'chest',
		secondaryMuscles: ['shoulders', 'triceps'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Secure your legs at the end of the decline bench and slowly lay down on the bench. Using a medium width grip (a grip that creates a 90-degree angle in the middle of the movement between the forearms and the upper arms), lift the bar from the rack and hold it straight over you with your arms locked. The arms should be perpendicular to the floor. This will be your starting position. Tip: In order to protect your rotator cuff, it is best if you have a spotter help you lift the barbell off the rack. As you breathe in, come down slowly until you feel the bar on your lower chest. After a second paus',
		imageUrls: [
			'/exercise-assets/decline_barbell_bench_press/0.webp',
			'/exercise-assets/decline_barbell_bench_press/1.webp'
		]
	},
	{
		key: 'incline_dumbbell_flyes',
		name: 'Incline Dumbbell Flyes',
		muscleGroup: 'chest',
		secondaryMuscles: ['shoulders'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Hold a dumbbell on each hand and lie on an incline bench that is set to an incline angle of no more than 30 degrees. Extend your arms above you with a slight bend at the elbows. Now rotate the wrists so that the palms of your hands are facing you. Tip: The pinky fingers should be next to each other. This will be your starting position. As you breathe in, start to slowly lower the arms to the side while keeping the arms extended and while rotating the wrists until the palms of the hand are facing each other. Tip: At the end of the movement the arms will be by your side with the palms facing the',
		imageUrls: [
			'/exercise-assets/incline_dumbbell_flyes/0.webp',
			'/exercise-assets/incline_dumbbell_flyes/1.webp'
		]
	},
	{
		key: 'dips_chest_version',
		name: 'Dips - Chest Version',
		muscleGroup: 'chest',
		secondaryMuscles: ['shoulders', 'triceps'],
		equipment: 'other',
		category: 'strength',
		description:
			'For this exercise you will need access to parallel bars. To get yourself into the starting position, hold your body at arms length (arms locked) above the bars. While breathing in, lower yourself slowly with your torso leaning forward around 30 degrees or so and your elbows flared out slightly until you feel a slight stretch in the chest. Once you feel the stretch, use your chest to bring your body back to the starting position as you breathe out. Tip: Remember to squeeze the chest at the top of the movement for a second. Repeat the movement for the prescribed amount of repetitions.',
		imageUrls: [
			'/exercise-assets/dips_chest_version/0.webp',
			'/exercise-assets/dips_chest_version/1.webp'
		]
	},
	{
		key: 'push_up_wide',
		name: 'Push-Up Wide',
		muscleGroup: 'chest',
		secondaryMuscles: ['abs', 'shoulders', 'triceps'],
		equipment: 'body only',
		category: 'strength',
		description:
			'With your hands wide apart, support your body on your toes and hands in a plank position. Your elbows should be extended and your body straight. Do not allow your hips to sag. This will be your starting position. To begin, allow the elbows to flex, lowering your chest to the floor as you inhale. Using your pectoral muscles, press your upper body back up to the starting position by extending the elbows. Exhale as you perform this step. After pausing at the contracted position, repeat the movement for the prescribed amount of repetitions.',
		imageUrls: ['/exercise-assets/push_up_wide/0.webp', '/exercise-assets/push_up_wide/1.webp']
	},
	{
		key: 'butterfly',
		name: 'Butterfly',
		muscleGroup: 'chest',
		secondaryMuscles: [],
		equipment: 'machine',
		category: 'strength',
		description:
			'Sit on the machine with your back flat on the pad. Take hold of the handles. Tip: Your upper arms should be positioned parallel to the floor; adjust the machine accordingly. This will be your starting position. Push the handles together slowly as you squeeze your chest in the middle. Breathe out during this part of the motion and hold the contraction for a second. Return back to the starting position slowly as you inhale until your chest muscles are fully stretched. Repeat for the recommended amount of repetitions.',
		imageUrls: ['/exercise-assets/butterfly/0.webp', '/exercise-assets/butterfly/1.webp']
	},
	{
		key: 'barbell_deadlift',
		name: 'Barbell Deadlift',
		muscleGroup: 'back',
		secondaryMuscles: ['calves', 'forearms', 'glutes', 'hamstrings', 'quadriceps'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Stand in front of a loaded barbell. While keeping the back as straight as possible, bend your knees, bend forward and grasp the bar using a medium (shoulder width) overhand grip. This will be the starting position of the exercise. Tip: If it is difficult to hold on to the bar with this grip, alternate your grip or use wrist straps. While holding the bar, start the lift by pushing with your legs while simultaneously getting your torso to the upright position as you breathe out. In the upright position, stick your chest out and contract the back by bringing the shoulder blades back. Think of how',
		imageUrls: [
			'/exercise-assets/barbell_deadlift/0.webp',
			'/exercise-assets/barbell_deadlift/1.webp'
		]
	},
	{
		key: 'bent_over_barbell_row',
		name: 'Bent Over Barbell Row',
		muscleGroup: 'back',
		secondaryMuscles: ['biceps', 'shoulders'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Holding a barbell with a pronated grip (palms facing down), bend your knees slightly and bring your torso forward, by bending at the waist, while keeping the back straight until it is almost parallel to the floor. Tip: Make sure that you keep the head up. The barbell should hang directly in front of you as your arms hang perpendicular to the floor and your torso. This is your starting position. Now, while keeping the torso stationary, breathe out and lift the barbell to you. Keep the elbows close to the body and only use the forearms to hold the weight. At the top contracted position, squeeze ',
		imageUrls: [
			'/exercise-assets/bent_over_barbell_row/0.webp',
			'/exercise-assets/bent_over_barbell_row/1.webp'
		]
	},
	{
		key: 'wide_grip_lat_pulldown',
		name: 'Wide-Grip Lat Pulldown',
		muscleGroup: 'back',
		secondaryMuscles: ['biceps', 'shoulders'],
		equipment: 'cable',
		category: 'strength',
		description:
			'Sit down on a pull-down machine with a wide bar attached to the top pulley. Make sure that you adjust the knee pad of the machine to fit your height. These pads will prevent your body from being raised by the resistance attached to the bar. Grab the bar with the palms facing forward using the prescribed grip. Note on grips: For a wide grip, your hands need to be spaced out at a distance wider than shoulder width. For a medium grip, your hands need to be spaced out at a distance equal to your shoulder width and for a close grip at a distance smaller than your shoulder width. As you have both ar',
		imageUrls: [
			'/exercise-assets/wide_grip_lat_pulldown/0.webp',
			'/exercise-assets/wide_grip_lat_pulldown/1.webp'
		]
	},
	{
		key: 'seated_cable_rows',
		name: 'Seated Cable Rows',
		muscleGroup: 'back',
		secondaryMuscles: ['biceps', 'shoulders'],
		equipment: 'cable',
		category: 'strength',
		description:
			'For this exercise you will need access to a low pulley row machine with a V-bar. Note: The V-bar will enable you to have a neutral grip where the palms of your hands face each other. To get into the starting position, first sit down on the machine and place your feet on the front platform or crossbar provided making sure that your knees are slightly bent and not locked. Lean over as you keep the natural alignment of your back and grab the V-bar handles. With your arms extended pull back until your torso is at a 90-degree angle from your legs. Your back should be slightly arched and your chest ',
		imageUrls: [
			'/exercise-assets/seated_cable_rows/0.webp',
			'/exercise-assets/seated_cable_rows/1.webp'
		]
	},
	{
		key: 'one_arm_dumbbell_row',
		name: 'One-Arm Dumbbell Row',
		muscleGroup: 'back',
		secondaryMuscles: ['biceps', 'shoulders'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Choose a flat bench and place a dumbbell on each side of it. Place the right leg on top of the end of the bench, bend your torso forward from the waist until your upper body is parallel to the floor, and place your right hand on the other end of the bench for support. Use the left hand to pick up the dumbbell on the floor and hold the weight while keeping your lower back straight. The palm of the hand should be facing your torso. This will be your starting position. Pull the resistance straight up to the side of your chest, keeping your upper arm close to your side and keeping the torso statio',
		imageUrls: [
			'/exercise-assets/one_arm_dumbbell_row/0.webp',
			'/exercise-assets/one_arm_dumbbell_row/1.webp'
		]
	},
	{
		key: 'chin_up',
		name: 'Chin-Up',
		muscleGroup: 'back',
		secondaryMuscles: ['biceps', 'forearms'],
		equipment: 'body only',
		category: 'strength',
		description:
			'Grab the pull-up bar with the palms facing your torso and a grip closer than the shoulder width. As you have both arms extended in front of you holding the bar at the chosen grip width, keep your torso as straight as possible while creating a curvature on your lower back and sticking your chest out. This is your starting position. Tip: Keeping the torso as straight as possible maximizes biceps stimulation while minimizing back involvement. As you breathe out, pull your torso up until your head is around the level of the pull-up bar. Concentrate on using the biceps muscles in order to perform t',
		imageUrls: ['/exercise-assets/chin_up/0.webp', '/exercise-assets/chin_up/1.webp']
	},
	{
		key: 'hyperextensions_back_extensions',
		name: 'Hyperextensions (Back Extensions)',
		muscleGroup: 'back',
		secondaryMuscles: ['glutes', 'hamstrings'],
		equipment: 'other',
		category: 'strength',
		description:
			'Lie face down on a hyperextension bench, tucking your ankles securely under the footpads. Adjust the upper pad if possible so your upper thighs lie flat across the wide pad, leaving enough room for you to bend at the waist without any restriction. With your body straight, cross your arms in front of you (my preference) or behind your head. This will be your starting position. Tip: You can also hold a weight plate for extra resistance in front of you under your crossed arms. Start bending forward slowly at the waist as far as you can while keeping your back flat. Inhale as you perform this move',
		imageUrls: [
			'/exercise-assets/hyperextensions_back_extensions/0.webp',
			'/exercise-assets/hyperextensions_back_extensions/1.webp'
		]
	},
	{
		key: 'barbell_shrug',
		name: 'Barbell Shrug',
		muscleGroup: 'back',
		secondaryMuscles: [],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Stand up straight with your feet at shoulder width as you hold a barbell with both hands in front of you using a pronated grip (palms facing the thighs). Tip: Your hands should be a little wider than shoulder width apart. You can use wrist wraps for this exercise for a better grip. This will be your starting position. Raise your shoulders up as far as you can go as you breathe out and hold the contraction for a second. Tip: Refrain from trying to lift the barbell by using your biceps. Slowly return to the starting position as you breathe in. Repeat for the recommended amount of repetitions.',
		imageUrls: ['/exercise-assets/barbell_shrug/0.webp', '/exercise-assets/barbell_shrug/1.webp']
	},
	{
		key: 'barbell_shoulder_press',
		name: 'Barbell Shoulder Press',
		muscleGroup: 'shoulders',
		secondaryMuscles: ['chest', 'triceps'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Sit on a bench with back support in a squat rack. Position a barbell at a height that is just above your head. Grab the barbell with a pronated grip (palms facing forward). Once you pick up the barbell with the correct grip width, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in front of your head. This is your starting position. Lower the bar down to the shoulders slowly as you inhale. Lift the bar back up to the starting position as you exhale. Repeat for the recommended amount of repetitions.',
		imageUrls: [
			'/exercise-assets/barbell_shoulder_press/0.webp',
			'/exercise-assets/barbell_shoulder_press/1.webp'
		]
	},
	{
		key: 'arnold_dumbbell_press',
		name: 'Arnold Dumbbell Press',
		muscleGroup: 'shoulders',
		secondaryMuscles: ['triceps'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Sit on an exercise bench with back support and hold two dumbbells in front of you at about upper chest level with your palms facing your body and your elbows bent. Tip: Your arms should be next to your torso. The starting position should look like the contracted portion of a dumbbell curl. Now to perform the movement, raise the dumbbells as you rotate the palms of your hands until they are facing forward. Continue lifting the dumbbells until your arms are extended above you in straight arm position. Breathe out as you perform this portion of the movement. After a second pause at the top, begin',
		imageUrls: [
			'/exercise-assets/arnold_dumbbell_press/0.webp',
			'/exercise-assets/arnold_dumbbell_press/1.webp'
		]
	},
	{
		key: 'standing_military_press',
		name: 'Standing Military Press',
		muscleGroup: 'shoulders',
		secondaryMuscles: ['triceps'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Start by placing a barbell that is about chest high on a squat rack. Once you have selected the weights, grab the barbell using a pronated (palms facing forward) grip. Make sure to grip the bar wider than shoulder width apart from each other. Slightly bend the knees and place the barbell on your collar bone. Lift the barbell up keeping it lying on your chest. Take a step back and position your feet shoulder width apart from each other. Once you pick up the barbell with the correct grip length, lift the bar up over your head by locking your arms. Hold at about shoulder level and slightly in fro',
		imageUrls: [
			'/exercise-assets/standing_military_press/0.webp',
			'/exercise-assets/standing_military_press/1.webp'
		]
	},
	{
		key: 'side_lateral_raise',
		name: 'Side Lateral Raise',
		muscleGroup: 'shoulders',
		secondaryMuscles: [],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Pick a couple of dumbbells and stand with a straight torso and the dumbbells by your side at arms length with the palms of the hand facing you. This will be your starting position. While maintaining the torso in a stationary position (no swinging), lift the dumbbells to your side with a slight bend on the elbow and the hands slightly tilted forward as if pouring water in a glass. Continue to go up until you arms are parallel to the floor. Exhale as you execute this movement and pause for a second at the top. Lower the dumbbells back down slowly to the starting position as you inhale. Repeat fo',
		imageUrls: [
			'/exercise-assets/side_lateral_raise/0.webp',
			'/exercise-assets/side_lateral_raise/1.webp'
		]
	},
	{
		key: 'reverse_flyes',
		name: 'Reverse Flyes',
		muscleGroup: 'shoulders',
		secondaryMuscles: [],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'To begin, lie down on an incline bench with the chest and stomach pressing against the incline. Have the dumbbells in each hand with the palms facing each other (neutral grip). Extend the arms in front of you so that they are perpendicular to the angle of the bench. The legs should be stationary while applying pressure with the ball of your toes. This is the starting position. Maintaining the slight bend of the elbows, move the weights out and away from each other (to the side) in an arc motion while exhaling. Tip: Try to squeeze your shoulder blades together to get the best results from this ',
		imageUrls: ['/exercise-assets/reverse_flyes/0.webp', '/exercise-assets/reverse_flyes/1.webp']
	},
	{
		key: 'front_dumbbell_raise',
		name: 'Front Dumbbell Raise',
		muscleGroup: 'shoulders',
		secondaryMuscles: [],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Pick a couple of dumbbells and stand with a straight torso and the dumbbells on front of your thighs at arms length with the palms of the hand facing your thighs. This will be your starting position. While maintaining the torso stationary (no swinging), lift the left dumbbell to the front with a slight bend on the elbow and the palms of the hands always facing down. Continue to go up until you arm is slightly above parallel to the floor. Exhale as you execute this portion of the movement and pause for a second at the top. Inhale after the second pause. Now lower the dumbbell back down slowly t',
		imageUrls: [
			'/exercise-assets/front_dumbbell_raise/0.webp',
			'/exercise-assets/front_dumbbell_raise/1.webp'
		]
	},
	{
		key: 'barbell_curl',
		name: 'Barbell Curl',
		muscleGroup: 'biceps',
		secondaryMuscles: ['forearms'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Stand up with your torso upright while holding a barbell at a shoulder-width grip. The palm of your hands should be facing forward and the elbows should be close to the torso. This will be your starting position. While holding the upper arms stationary, curl the weights forward while contracting the biceps as you breathe out. Tip: Only the forearms should move. Continue the movement until your biceps are fully contracted and the bar is at shoulder level. Hold the contracted position for a second and squeeze the biceps hard. Slowly begin to bring the bar back to starting position as your breath',
		imageUrls: ['/exercise-assets/barbell_curl/0.webp', '/exercise-assets/barbell_curl/1.webp']
	},
	{
		key: 'alternate_hammer_curl',
		name: 'Alternate Hammer Curl',
		muscleGroup: 'biceps',
		secondaryMuscles: ['forearms'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Stand up with your torso upright and a dumbbell in each hand being held at arms length. The elbows should be close to the torso. The palms of the hands should be facing your torso. This will be your starting position. While holding the upper arm stationary, curl the right weight forward while contracting the biceps as you breathe out. Continue the movement until your biceps is fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a second as you squeeze the biceps. Tip: Only the forearms should move. Slowly begin to bring the dumbbells back to starting posi',
		imageUrls: [
			'/exercise-assets/alternate_hammer_curl/0.webp',
			'/exercise-assets/alternate_hammer_curl/1.webp'
		]
	},
	{
		key: 'concentration_curls',
		name: 'Concentration Curls',
		muscleGroup: 'biceps',
		secondaryMuscles: ['forearms'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Sit down on a flat bench with one dumbbell in front of you between your legs. Your legs should be spread with your knees bent and feet on the floor. Use your right arm to pick the dumbbell up. Place the back of your right upper arm on the top of your inner right thigh. Rotate the palm of your hand until it is facing forward away from your thigh. Tip: Your arm should be extended and the dumbbell should be above the floor. This will be your starting position. While holding the upper arm stationary, curl the weights forward while contracting the biceps as you breathe out. Only the forearms should',
		imageUrls: [
			'/exercise-assets/concentration_curls/0.webp',
			'/exercise-assets/concentration_curls/1.webp'
		]
	},
	{
		key: 'alternate_incline_dumbbell_curl',
		name: 'Alternate Incline Dumbbell Curl',
		muscleGroup: 'biceps',
		secondaryMuscles: ['forearms'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Sit down on an incline bench with a dumbbell in each hand being held at arms length. Tip: Keep the elbows close to the torso.This will be your starting position. While holding the upper arm stationary, curl the right weight forward while contracting the biceps as you breathe out. As you do so, rotate the hand so that the palm is facing up. Continue the movement until your biceps is fully contracted and the dumbbells are at shoulder level. Hold the contracted position for a second as you squeeze the biceps. Tip: Only the forearms should move. Slowly begin to bring the dumbbell back to starting ',
		imageUrls: [
			'/exercise-assets/alternate_incline_dumbbell_curl/0.webp',
			'/exercise-assets/alternate_incline_dumbbell_curl/1.webp'
		]
	},
	{
		key: 'cable_hammer_curls_rope_attachment',
		name: 'Cable Hammer Curls - Rope Attachment',
		muscleGroup: 'biceps',
		secondaryMuscles: [],
		equipment: 'cable',
		category: 'strength',
		description:
			'Attach a rope attachment to a low pulley and stand facing the machine about 12 inches away from it. Grasp the rope with a neutral (palms-in) grip and stand straight up keeping the natural arch of the back and your torso stationary. Put your elbows in by your side and keep them there stationary during the entire movement. Tip: Only the forearms should move; not your upper arms. This will be your starting position. Using your biceps, pull your arms up as you exhale until your biceps touch your forearms. Tip: Remember to keep the elbows in and your upper arms stationary. After a 1 second contract',
		imageUrls: [
			'/exercise-assets/cable_hammer_curls_rope_attachment/0.webp',
			'/exercise-assets/cable_hammer_curls_rope_attachment/1.webp'
		]
	},
	{
		key: 'preacher_curl',
		name: 'Preacher Curl',
		muscleGroup: 'biceps',
		secondaryMuscles: [],
		equipment: 'barbell',
		category: 'strength',
		description:
			'To perform this movement you will need a preacher bench and an E-Z bar. Grab the E-Z curl bar at the close inner handle (either have someone hand you the bar which is preferable or grab the bar from the front bar rest provided by most preacher benches). The palm of your hands should be facing forward and they should be slightly tilted inwards due to the shape of the bar. With the upper arms positioned against the preacher bench pad and the chest against it, hold the E-Z Curl Bar at shoulder length. This will be your starting position. As you breathe in, slowly lower the bar until your upper ar',
		imageUrls: ['/exercise-assets/preacher_curl/0.webp', '/exercise-assets/preacher_curl/1.webp']
	},
	{
		key: 'close_grip_barbell_bench_press',
		name: 'Close-Grip Barbell Bench Press',
		muscleGroup: 'triceps',
		secondaryMuscles: ['chest', 'shoulders'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Lie back on a flat bench. Using a close grip (around shoulder width), lift the bar from the rack and hold it straight over you with your arms locked. This will be your starting position. As you breathe in, come down slowly until you feel the bar on your middle chest. Tip: Make sure that - as opposed to a regular bench press - you keep the elbows close to the torso at all times in order to maximize triceps involvement. After a second pause, bring the bar back to the starting position as you breathe out and push the bar using your triceps muscles. Lock your arms in the contracted position, hold ',
		imageUrls: [
			'/exercise-assets/close_grip_barbell_bench_press/0.webp',
			'/exercise-assets/close_grip_barbell_bench_press/1.webp'
		]
	},
	{
		key: 'dips_triceps_version',
		name: 'Dips - Triceps Version',
		muscleGroup: 'triceps',
		secondaryMuscles: ['chest', 'shoulders'],
		equipment: 'body only',
		category: 'strength',
		description:
			"To get into the starting position, hold your body at arm's length with your arms nearly locked above the bars. Now, inhale and slowly lower yourself downward. Your torso should remain upright and your elbows should stay close to your body. This helps to better focus on tricep involvement. Lower yourself until there is a 90 degree angle formed between the upper arm and forearm. Then, exhale and push your torso back up using your triceps to bring your body back to the starting position. Repeat the movement for the prescribed amount of repetitions.",
		imageUrls: [
			'/exercise-assets/dips_triceps_version/0.webp',
			'/exercise-assets/dips_triceps_version/1.webp'
		]
	},
	{
		key: 'cable_rope_overhead_triceps_extension',
		name: 'Cable Rope Overhead Triceps Extension',
		muscleGroup: 'triceps',
		secondaryMuscles: [],
		equipment: 'cable',
		category: 'strength',
		description:
			'Attach a rope to the bottom pulley of the pulley machine. Grasping the rope with both hands, extend your arms with your hands directly above your head using a neutral grip (palms facing each other). Your elbows should be in close to your head and the arms should be perpendicular to the floor with the knuckles aimed at the ceiling. This will be your starting position. Slowly lower the rope behind your head as you hold the upper arms stationary. Inhale as you perform this movement and pause when your triceps are fully stretched. Return to the starting position by flexing your triceps as you brea',
		imageUrls: [
			'/exercise-assets/cable_rope_overhead_triceps_extension/0.webp',
			'/exercise-assets/cable_rope_overhead_triceps_extension/1.webp'
		]
	},
	{
		key: 'decline_dumbbell_triceps_extension',
		name: 'Decline Dumbbell Triceps Extension',
		muscleGroup: 'triceps',
		secondaryMuscles: [],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Secure your legs at the end of the decline bench and lie down with a dumbbell on each hand on top of your thighs. The palms of your hand will be facing each other. Once you are laying down, move the dumbbells in front of you at shoulder width. The palms of the hands should be facing each other and the arms should be perpendicular to the floor and fully extended. This will be your starting position. As you breathe in and you keep the upper arms stationary (and elbows in), bring the dumbbells down slowly by moving your forearms in a semicircular motion towards you until your thumbs are next to y',
		imageUrls: [
			'/exercise-assets/decline_dumbbell_triceps_extension/0.webp',
			'/exercise-assets/decline_dumbbell_triceps_extension/1.webp'
		]
	},
	{
		key: 'tricep_dumbbell_kickback',
		name: 'Tricep Dumbbell Kickback',
		muscleGroup: 'triceps',
		secondaryMuscles: [],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Start with a dumbbell in each hand and your palms facing your torso. Keep your back straight with a slight bend in the knees and bend forward at the waist. Your torso should be almost parallel to the floor. Make sure to keep your head up. Your upper arms should be close to your torso and parallel to the floor. Your forearms should be pointed towards the floor as you hold the weights. There should be a 90-degree angle formed between your forearm and upper arm. This is your starting position. Now, while keeping your upper arms stationary, exhale and use your triceps to lift the weights until the',
		imageUrls: [
			'/exercise-assets/tricep_dumbbell_kickback/0.webp',
			'/exercise-assets/tricep_dumbbell_kickback/1.webp'
		]
	},
	{
		key: 'barbell_squat',
		name: 'Barbell Squat',
		muscleGroup: 'quadriceps',
		secondaryMuscles: ['back', 'calves', 'glutes', 'hamstrings'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack to just below shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it. Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso. Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head up at all times and al',
		imageUrls: ['/exercise-assets/barbell_squat/0.webp', '/exercise-assets/barbell_squat/1.webp']
	},
	{
		key: 'front_squat_clean_grip',
		name: 'Front Squat (Clean Grip)',
		muscleGroup: 'quadriceps',
		secondaryMuscles: ['abs', 'glutes', 'hamstrings'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'To begin, first set the bar in a rack slightly below shoulder level. Rest the bar on top of the deltoids, pushing into the clavicles, and lightly touching the throat. Your hands should be in a clean grip, touching the bar only with your fingers to help keep it in position. Lift the bar off the rack by first pushing with your legs and at the same time straightening your torso. Step away from the rack and position your legs using a shoulder width medium stance with the toes slightly pointed out. Keep your head and elbows up at all times. This will be your starting position. Bend at the knees, si',
		imageUrls: [
			'/exercise-assets/front_squat_clean_grip/0.webp',
			'/exercise-assets/front_squat_clean_grip/1.webp'
		]
	},
	{
		key: 'leg_press',
		name: 'Leg Press',
		muscleGroup: 'quadriceps',
		secondaryMuscles: ['calves', 'glutes', 'hamstrings'],
		equipment: 'machine',
		category: 'strength',
		description:
			'Using a leg press machine, sit down on the machine and place your legs on the platform directly in front of you at a medium (shoulder width) foot stance. (Note: For the purposes of this discussion we will use the medium stance described above which targets overall development; however you can choose any of the three stances described in the foot positioning section). Lower the safety bars holding the weighted platform in place and press the platform all the way up until your legs are fully extended in front of you. Tip: Make sure that you do not lock your knees. Your torso and the legs should ',
		imageUrls: ['/exercise-assets/leg_press/0.webp', '/exercise-assets/leg_press/1.webp']
	},
	{
		key: 'barbell_lunge',
		name: 'Barbell Lunge',
		muscleGroup: 'quadriceps',
		secondaryMuscles: ['calves', 'glutes', 'hamstrings'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'This exercise is best performed inside a squat rack for safety purposes. To begin, first set the bar on a rack just below shoulder level. Once the correct height is chosen and the bar is loaded, step under the bar and place the back of your shoulders (slightly below the neck) across it. Hold on to the bar using both arms at each side and lift it off the rack by first pushing with your legs and at the same time straightening your torso. Step away from the rack and step forward with your right leg and squat down through your hips, while keeping the torso upright and maintaining balance. Inhale a',
		imageUrls: ['/exercise-assets/barbell_lunge/0.webp', '/exercise-assets/barbell_lunge/1.webp']
	},
	{
		key: 'dumbbell_lunges',
		name: 'Dumbbell Lunges',
		muscleGroup: 'quadriceps',
		secondaryMuscles: ['calves', 'glutes', 'hamstrings'],
		equipment: 'dumbbell',
		category: 'strength',
		description:
			'Stand with your torso upright holding two dumbbells in your hands by your sides. This will be your starting position. Step forward with your right leg around 2 feet or so from the foot being left stationary behind and lower your upper body down, while keeping the torso upright and maintaining balance. Inhale as you go down. Note: As in the other exercises, do not allow your knee to go forward beyond your toes as you come down, as this will put undue stress on the knee joint. Make sure that you keep your front shin perpendicular to the ground. Using mainly the heel of your foot, push up and go ',
		imageUrls: [
			'/exercise-assets/dumbbell_lunges/0.webp',
			'/exercise-assets/dumbbell_lunges/1.webp'
		]
	},
	{
		key: 'bodyweight_squat',
		name: 'Bodyweight Squat',
		muscleGroup: 'quadriceps',
		secondaryMuscles: ['glutes', 'hamstrings'],
		equipment: 'body only',
		category: 'strength',
		description:
			'Stand with your feet shoulder width apart. You can place your hands behind your head. This will be your starting position. Begin the movement by flexing your knees and hips, sitting back with your hips. Continue down to full depth if you are able,and quickly reverse the motion until you return to the starting position. As you squat, keep your head and chest up and push your knees out.',
		imageUrls: [
			'/exercise-assets/bodyweight_squat/0.webp',
			'/exercise-assets/bodyweight_squat/1.webp'
		]
	},
	{
		key: 'leg_extensions',
		name: 'Leg Extensions',
		muscleGroup: 'quadriceps',
		secondaryMuscles: [],
		equipment: 'machine',
		category: 'strength',
		description:
			'For this exercise you will need to use a leg extension machine. First choose your weight and sit on the machine with your legs under the pad (feet pointed forward) and the hands holding the side bars. This will be your starting position. Tip: You will need to adjust the pad so that it falls on top of your lower leg (just above your feet). Also, make sure that your legs form a 90-degree angle between the lower and upper leg. If the angle is less than 90-degrees then that means the knee is over the toes which in turn creates undue stress at the knee joint. If the machine is designed that way, ei',
		imageUrls: ['/exercise-assets/leg_extensions/0.webp', '/exercise-assets/leg_extensions/1.webp']
	},
	{
		key: 'lying_leg_curls',
		name: 'Lying Leg Curls',
		muscleGroup: 'hamstrings',
		secondaryMuscles: [],
		equipment: 'machine',
		category: 'strength',
		description:
			'Adjust the machine lever to fit your height and lie face down on the leg curl machine with the pad of the lever on the back of your legs (just a few inches under the calves). Tip: Preferably use a leg curl machine that is angled as opposed to flat since an angled position is more favorable for hamstrings recruitment. Keeping the torso flat on the bench, ensure your legs are fully stretched and grab the side handles of the machine. Position your toes straight (or you can also use any of the other two stances described on the foot positioning section). This will be your starting position. As you',
		imageUrls: [
			'/exercise-assets/lying_leg_curls/0.webp',
			'/exercise-assets/lying_leg_curls/1.webp'
		]
	},
	{
		key: 'stiff_legged_barbell_deadlift',
		name: 'Stiff-Legged Barbell Deadlift',
		muscleGroup: 'hamstrings',
		secondaryMuscles: ['back', 'glutes'],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Grasp a bar using an overhand grip (palms facing down). You may need some wrist wraps if using a significant amount of weight. Stand with your torso straight and your legs spaced using a shoulder width or narrower stance. The knees should be slightly bent. This is your starting position. Keeping the knees stationary, lower the barbell to over the top of your feet by bending at the hips while keeping your back straight. Keep moving forward as if you were going to pick something from the floor until you feel a stretch on the hamstrings. Inhale as you perform this movement. Start bringing your to',
		imageUrls: [
			'/exercise-assets/stiff_legged_barbell_deadlift/0.webp',
			'/exercise-assets/stiff_legged_barbell_deadlift/1.webp'
		]
	},
	{
		key: 'barbell_hip_thrust',
		name: 'Barbell Hip Thrust',
		muscleGroup: 'glutes',
		secondaryMuscles: ['calves', 'hamstrings'],
		equipment: 'barbell',
		category: 'powerlifting',
		description:
			'Begin seated on the ground with a bench directly behind you. Have a loaded barbell over your legs. Using a fat bar or having a pad on the bar can greatly reduce the discomfort caused by this exercise. Roll the bar so that it is directly above your hips, and lean back against the bench so that your shoulder blades are near the top of it. Begin the movement by driving through your feet, extending your hips vertically through the bar. Your weight should be supported by your shoulder blades and your feet. Extend as far as possible, then reverse the motion to return to the starting position.',
		imageUrls: [
			'/exercise-assets/barbell_hip_thrust/0.webp',
			'/exercise-assets/barbell_hip_thrust/1.webp'
		]
	},
	{
		key: 'glute_ham_raise',
		name: 'Glute Ham Raise',
		muscleGroup: 'glutes',
		secondaryMuscles: ['calves'],
		equipment: 'machine',
		category: 'powerlifting',
		description:
			'Begin by adjusting the equipment to fit your body. Place your feet against the footplate in between the rollers as you lie facedown. Your knees should be just behind the pad. Start from the bottom of the movement. Keep your back arched as you begin the movement by flexing the knees. Drive your toes into the foot plate as you do so. Keep your upper body straight, and continue until your body is upright. Return to the starting position, keeping your descent under control.',
		imageUrls: [
			'/exercise-assets/glute_ham_raise/0.webp',
			'/exercise-assets/glute_ham_raise/1.webp'
		]
	},
	{
		key: 'standing_calf_raises',
		name: 'Standing Calf Raises',
		muscleGroup: 'calves',
		secondaryMuscles: [],
		equipment: 'machine',
		category: 'strength',
		description:
			'Adjust the padded lever of the calf raise machine to fit your height. Place your shoulders under the pads provided and position your toes facing forward (or using any of the two other positions described at the beginning of the chapter). The balls of your feet should be secured on top of the calf block with the heels extending off it. Push the lever up by extending your hips and knees until your torso is standing erect. The knees should be kept with a slight bend; never locked. Toes should be facing forward, outwards or inwards as described at the beginning of the chapter. This will be your st',
		imageUrls: [
			'/exercise-assets/standing_calf_raises/0.webp',
			'/exercise-assets/standing_calf_raises/1.webp'
		]
	},
	{
		key: 'seated_calf_raise',
		name: 'Seated Calf Raise',
		muscleGroup: 'calves',
		secondaryMuscles: [],
		equipment: 'machine',
		category: 'strength',
		description:
			'Sit on the machine and place your toes on the lower portion of the platform provided with the heels extending off. Choose the toe positioning of your choice (forward, in, or out) as per the beginning of this chapter. Place your lower thighs under the lever pad, which will need to be adjusted according to the height of your thighs. Now place your hands on top of the lever pad in order to prevent it from slipping forward. Lift the lever slightly by pushing your heels up and release the safety bar. This will be your starting position. Slowly lower your heels by bending at the ankles until the cal',
		imageUrls: [
			'/exercise-assets/seated_calf_raise/0.webp',
			'/exercise-assets/seated_calf_raise/1.webp'
		]
	},
	{
		key: 'calf_press',
		name: 'Calf Press',
		muscleGroup: 'calves',
		secondaryMuscles: [],
		equipment: 'machine',
		category: 'strength',
		description:
			'Adjust the seat so that your legs are only slightly bent in the start position. The balls of your feet should be firmly on the platform. Select an appropriate weight, and grasp the handles. This will be your starting position. Straighten the legs by extending the knees, just barely lifting the weight from the stack. Your ankle should be fully flexed, toes pointing up. Execute the movement by pressing downward through the balls of your feet as far as possible. After a brief pause, reverse the motion and repeat.',
		imageUrls: ['/exercise-assets/calf_press/0.webp', '/exercise-assets/calf_press/1.webp']
	},
	{
		key: 'plank',
		name: 'Plank',
		muscleGroup: 'abs',
		secondaryMuscles: [],
		equipment: 'body only',
		category: 'strength',
		description:
			'Get into a prone position on the floor, supporting your weight on your toes and your forearms. Your arms are bent and directly below the shoulder. Keep your body straight at all times, and hold this position as long as possible. To increase difficulty, an arm or leg can be raised.',
		imageUrls: ['/exercise-assets/plank/0.webp', '/exercise-assets/plank/1.webp']
	},
	{
		key: 'crunches',
		name: 'Crunches',
		muscleGroup: 'abs',
		secondaryMuscles: [],
		equipment: 'body only',
		category: 'strength',
		description:
			"Lie flat on your back with your feet flat on the ground, or resting on a bench with your knees bent at a 90 degree angle. If you are resting your feet on a bench, place them three to four inches apart and point your toes inward so they touch. Now place your hands lightly on either side of your head keeping your elbows in. Tip: Don't lock your fingers behind your head. While pushing the small of your back down in the floor to better isolate your abdominal muscles, begin to roll your shoulders off the floor. Continue to push down as hard as you can with your lower back as you contract your abdom",
		imageUrls: ['/exercise-assets/crunches/0.webp', '/exercise-assets/crunches/1.webp']
	},
	{
		key: 'cable_crunch',
		name: 'Cable Crunch',
		muscleGroup: 'abs',
		secondaryMuscles: [],
		equipment: 'cable',
		category: 'strength',
		description:
			'Kneel below a high pulley that contains a rope attachment. Grasp cable rope attachment and lower the rope until your hands are placed next to your face. Flex your hips slightly and allow the weight to hyperextend the lower back. This will be your starting position. With the hips stationary, flex the waist as you contract the abs so that the elbows travel towards the middle of the thighs. Exhale as you perform this portion of the movement and hold the contraction for a second. Slowly return to the starting position as you inhale. Tip: Make sure that you keep constant tension on the abs througho',
		imageUrls: ['/exercise-assets/cable_crunch/0.webp', '/exercise-assets/cable_crunch/1.webp']
	},
	{
		key: 'hanging_leg_raise',
		name: 'Hanging Leg Raise',
		muscleGroup: 'abs',
		secondaryMuscles: [],
		equipment: 'body only',
		category: 'strength',
		description:
			'Hang from a chin-up bar with both arms extended at arms length in top of you using either a wide grip or a medium grip. The legs should be straight down with the pelvis rolled slightly backwards. This will be your starting position. Raise your legs until the torso makes a 90-degree angle with the legs. Exhale as you perform this movement and hold the contraction for a second or so. Go back slowly to the starting position as you breathe in. Repeat for the recommended amount of repetitions.',
		imageUrls: [
			'/exercise-assets/hanging_leg_raise/0.webp',
			'/exercise-assets/hanging_leg_raise/1.webp'
		]
	},
	{
		key: 'cross_body_crunch',
		name: 'Cross-Body Crunch',
		muscleGroup: 'abs',
		secondaryMuscles: [],
		equipment: 'body only',
		category: 'strength',
		description:
			'Lie flat on your back and bend your knees about 60 degrees. Keep your feet flat on the floor and place your hands loosely behind your head. This will be your starting position. Now curl up and bring your right elbow and shoulder across your body while bring your left knee in toward your left shoulder at the same time. Reach with your elbow and try to touch your knee. Exhale as you perform this movement. Tip: Try to bring your shoulder up towards your knee rather than just your elbow and remember that the key is to contract the abs as you perform the movement; not just to move the elbow. Now go',
		imageUrls: [
			'/exercise-assets/cross_body_crunch/0.webp',
			'/exercise-assets/cross_body_crunch/1.webp'
		]
	},
	{
		key: '3_4_sit_up',
		name: '3/4 Sit-Up',
		muscleGroup: 'abs',
		secondaryMuscles: [],
		equipment: 'body only',
		category: 'strength',
		description:
			'Lie down on the floor and secure your feet. Your legs should be bent at the knees. Place your hands behind or to the side of your head. You will begin with your back on the ground. This will be your starting position. Flex your hips and spine to raise your torso toward your knees. At the top of the contraction your torso should be perpendicular to the ground. Reverse the motion, going only \u00be of the way down. Repeat for the recommended amount of repetitions.',
		imageUrls: ['/exercise-assets/3_4_sit_up/0.webp', '/exercise-assets/3_4_sit_up/1.webp']
	},
	{
		key: 'russian_twist',
		name: 'Russian Twist',
		muscleGroup: 'abs',
		secondaryMuscles: ['back'],
		equipment: 'body only',
		category: 'strength',
		description:
			'Lie down on the floor placing your feet either under something that will not move or by having a partner hold them. Your legs should be bent at the knees. Elevate your upper body so that it creates an imaginary V-shape with your thighs. Your arms should be fully extended in front of you perpendicular to your torso and with the hands clasped. This is the starting position. Twist your torso to the right side until your arms are parallel with the floor while breathing out. Hold the contraction for a second and move back to the starting position while breathing out. Now move to the opposite side p',
		imageUrls: ['/exercise-assets/russian_twist/0.webp', '/exercise-assets/russian_twist/1.webp']
	},
	{
		key: 'seated_palm_up_barbell_wrist_curl',
		name: 'Seated Palm-Up Barbell Wrist Curl',
		muscleGroup: 'forearms',
		secondaryMuscles: [],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Hold a barbell with both hands and your palms facing up; hands spaced about shoulder width. Place your feet flat on the floor, at a distance that is slightly wider than shoulder width apart. Lean forward and place your forearms on top of your upper thighs with your palms up. Tip: Make sure that the front of the wrists lay on top of your knees. This will be your starting position. Lower the bar as far as possible while inhaling and keeping a tight grip. Now curl bar up as high as possible while flexing the forearms and exhaling. Hold the contraction at the top for a second and Tip: Only the wri',
		imageUrls: [
			'/exercise-assets/seated_palm_up_barbell_wrist_curl/0.webp',
			'/exercise-assets/seated_palm_up_barbell_wrist_curl/1.webp'
		]
	},
	{
		key: 'palms_up_barbell_wrist_curl_over_a_bench',
		name: 'Palms-Up Barbell Wrist Curl Over A Bench',
		muscleGroup: 'forearms',
		secondaryMuscles: [],
		equipment: 'barbell',
		category: 'strength',
		description:
			'Start out by placing a barbell on one side of a flat bench. Kneel down on both of your knees so that your body is facing the flat bench. Use your arms to grab the barbell with a supinated grip (palms up) and bring them up so that your forearms are resting against the flat bench. Your wrists should be hanging over the edge. Start out by curling your wrist upwards and exhaling. Slowly lower your wrists back down to the starting position while inhaling. Your forearms should be stationary as your wrist is the only movement needed to perform this exercise. Repeat for the recommended amount of repet',
		imageUrls: [
			'/exercise-assets/palms_up_barbell_wrist_curl_over_a_bench/0.webp',
			'/exercise-assets/palms_up_barbell_wrist_curl_over_a_bench/1.webp'
		]
	},
	{
		key: 'kettlebell_thruster',
		name: 'Kettlebell Thruster',
		muscleGroup: 'full_body',
		secondaryMuscles: ['quadriceps', 'triceps'],
		equipment: 'kettlebells',
		category: 'strength',
		description:
			'Clean two kettlebells to your shoulders. Clean the kettlebells to your shoulders by extending through the legs and hips as you pull the kettlebells towards your shoulders. Rotate your wrists as you do so. This will be your starting position. Begin to squat by flexing your hips and knees, lowering your hips between your legs. Maintain an upright, straight back as you descend as low as you can. At the bottom, reverse direction and squat by extending your knees and hips, driving through your heels. As you do so, press both kettlebells overhead by extending your arms straight up, using the momentu',
		imageUrls: [
			'/exercise-assets/kettlebell_thruster/0.webp',
			'/exercise-assets/kettlebell_thruster/1.webp'
		]
	},
	{
		key: 'wind_sprints',
		name: 'Wind Sprints',
		muscleGroup: 'cardio',
		secondaryMuscles: [],
		equipment: 'body only',
		category: 'strength',
		description:
			'Hang from a pull-up bar using a pronated grip. Your arms and legs should be extended. This will be your starting position. Begin by quickly raising one knee as high as you can. Do not swing your body or your legs. 3 Immediately reverse the motion, returning that leg to the starting position. Simultaneously raise the opposite knee as high as possible. Continue alternating between legs until the set is complete.',
		imageUrls: ['/exercise-assets/wind_sprints/0.webp', '/exercise-assets/wind_sprints/1.webp']
	},
	{
		key: 'mountain_climbers',
		name: 'Mountain Climbers',
		muscleGroup: 'cardio',
		secondaryMuscles: ['chest', 'hamstrings', 'shoulders'],
		equipment: '',
		category: 'plyometrics',
		description:
			'Begin in a pushup position, with your weight supported by your hands and toes. Flexing the knee and hip, bring one leg until the knee is approximately under the hip. This will be your starting position. Explosively reverse the positions of your legs, extending the bent leg until the leg is straight and supported by the toe, and bringing the other foot up with the hip and knee flexed. Repeat in an alternating fashion for 20-30 seconds.',
		imageUrls: [
			'/exercise-assets/mountain_climbers/0.webp',
			'/exercise-assets/mountain_climbers/1.webp'
		]
	},
	{
		key: 'double_kettlebell_snatch',
		name: 'Double Kettlebell Snatch',
		muscleGroup: 'full_body',
		secondaryMuscles: ['glutes', 'hamstrings', 'quadriceps'],
		equipment: 'kettlebells',
		category: 'strength',
		description:
			'Place two kettlebells behind your feet. Bend your knees and sit back to pick up the kettlebells. Swing the kettlebells between your legs forcefully and reverse the direction. Drive through with your hips and lock the ketttlebells overhead in one uninterrupted motion.',
		imageUrls: [
			'/exercise-assets/double_kettlebell_snatch/0.webp',
			'/exercise-assets/double_kettlebell_snatch/1.webp'
		]
	},
	{
		key: 'rope_jumping',
		name: 'Rope Jumping',
		muscleGroup: 'cardio',
		secondaryMuscles: ['calves', 'hamstrings'],
		equipment: 'other',
		category: 'cardio',
		description:
			'Hold an end of the rope in each hand. Position the rope behind you on the ground. Raise your arms up and turn the rope over your head bringing it down in front of you. When it reaches the ground, jump over it. Find a good turning pace that can be maintained. Different speeds and techniques can be used to introduce variation. Rope jumping is exciting, challenges your coordination, and requires a lot of energy. A 150 lb person will burn about 350 calories jumping rope for 30 minutes, compared to over 450 calories running.',
		imageUrls: ['/exercise-assets/rope_jumping/0.webp', '/exercise-assets/rope_jumping/1.webp']
	}
];
