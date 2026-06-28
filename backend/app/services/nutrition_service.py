from app.models.schemas import GoalType, UserGoalCreate, UserGoalResponse


def calculate_targets(goal: UserGoalCreate) -> dict:
    weight = goal.current_weight or 70
    height = goal.height or 170
    age = goal.age or 25

    bmr = 10 * weight + 6.25 * height - 5 * age + 5

    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9,
    }
    tdee = bmr * activity_multipliers.get(goal.activity_level or "moderate", 1.55)

    if goal.goal_type == GoalType.weight_loss:
        calorie_target = int(tdee - 500)
        protein_ratio = 0.35
        fat_ratio = 0.25
        carbs_ratio = 0.40
    elif goal.goal_type == GoalType.weight_gain:
        calorie_target = int(tdee + 400)
        protein_ratio = 0.25
        fat_ratio = 0.25
        carbs_ratio = 0.50
    elif goal.goal_type == GoalType.muscle_building:
        calorie_target = int(tdee + 300)
        protein_ratio = 0.35
        fat_ratio = 0.25
        carbs_ratio = 0.40
    else:
        calorie_target = int(tdee)
        protein_ratio = 0.25
        fat_ratio = 0.30
        carbs_ratio = 0.45

    protein_target = int((calorie_target * protein_ratio) / 4)
    fat_target = int((calorie_target * fat_ratio) / 9)
    carbs_target = int((calorie_target * carbs_ratio) / 4)
    if getattr(goal, 'water_target', None):
        water_target = round(goal.water_target, 1)
    else:
        water_target = round(max(2.0, min(3.5, weight * 0.033)), 1)

    return {
        "daily_calorie_target": calorie_target,
        "daily_protein_target": protein_target,
        "daily_carbs_target": carbs_target,
        "daily_fat_target": fat_target,
        "daily_water_target": water_target,
    }
