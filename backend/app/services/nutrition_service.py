from app.models.schemas import GoalType, UserGoalCreate


def calculate_targets(goal: UserGoalCreate) -> dict:
    weight = goal.current_weight or 70
    target_weight = goal.target_weight or weight
    height = goal.height or 170
    age = goal.age or 25
    gender = getattr(goal, 'gender', None) or 'male'

    # Mifflin-St Jeor
    gender_offset = -161 if gender == 'female' else 5
    bmr = 10 * weight + 6.25 * height - 5 * age + gender_offset

    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }
    tdee = bmr * activity_multipliers.get(goal.activity_level or "moderate", 1.55)

    if goal.goal_type == GoalType.weight_loss:
        calorie_target = max(int(tdee - 500), 1300)
        protein_target = int(target_weight * 2.0)
    elif goal.goal_type == GoalType.weight_gain:
        calorie_target = int(tdee + 300)
        protein_target = int(weight * 2.2)
    elif goal.goal_type == GoalType.muscle_building:
        calorie_target = int(tdee + 250)
        protein_target = int(weight * 2.2)
    else:  # maintenance
        calorie_target = int(tdee)
        protein_target = int(weight * 1.5)

    fat_target = int((calorie_target * 0.30) / 9)
    carb_calories = calorie_target - (protein_target * 4) - (fat_target * 9)
    carbs_target = max(0, int(carb_calories / 4))

    water_target = round(weight * 35 / 1000, 1)

    return {
        "daily_calorie_target": calorie_target,
        "daily_protein_target": protein_target,
        "daily_carbs_target": carbs_target,
        "daily_fat_target": fat_target,
        "daily_water_target": water_target,
    }
