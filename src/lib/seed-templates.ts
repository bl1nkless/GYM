"use server";

import { createClient } from "@/lib/supabase/server";

// Твоя программа Upper/Lower
const DEFAULT_TEMPLATES = [
  {
    name: "Upper Body: A",
    exercises: [
      { name: "Тяга верхнего блока", sets: "2x15", muscleGroup: "Спина" },
      { name: "Жим в Смите на наклонной", sets: "3x6", muscleGroup: "Грудь" },
      { name: "Пек-дек (бабочка)", sets: "2x15-20", muscleGroup: "Грудь" },
      {
        name: "Тяга в тренажере (верх спины)",
        sets: "3x10",
        muscleGroup: "Спина",
      },
      {
        name: "Махи в кроссовере в стороны",
        sets: "3x отказ",
        muscleGroup: "Плечи",
      },
      { name: "Сгибания на Скотта", sets: "3x10", muscleGroup: "Бицепс" },
      { name: "Французский жим стоя", sets: "3x10", muscleGroup: "Трицепс" },
    ],
  },
  {
    name: "Lower Body: A",
    exercises: [
      { name: "Сгибания ног сидя", sets: "2x15", muscleGroup: "Бицепс бедра" },
      { name: "Гакк-присед", sets: "3x8", muscleGroup: "Квадрицепсы" },
      {
        name: "Болгарские сплит-приседания",
        sets: "3x10",
        muscleGroup: "Квадрицепсы",
      },
      { name: "Подъемы на носки стоя", sets: "3x15", muscleGroup: "Икры" },
    ],
  },
  {
    name: "Upper Body: B",
    exercises: [
      { name: "Жим гантелей на наклонной", sets: "3x10", muscleGroup: "Грудь" },
      { name: "Тяга с опорой на грудь", sets: "3x10", muscleGroup: "Спина" },
      { name: "Французский жим лежа", sets: "3x8-12", muscleGroup: "Трицепс" },
      {
        name: "Сгибания на наклонной",
        sets: "2x отказ",
        muscleGroup: "Бицепс",
      },
      {
        name: "Тяга верхнего блока обратным хватом",
        sets: "3x10",
        muscleGroup: "Спина",
      },
      {
        name: "Разведение рук в кроссовере",
        sets: "2x отказ",
        muscleGroup: "Плечи",
      },
    ],
  },
  {
    name: "Lower Body: B (+плечи)",
    exercises: [
      { name: "Жим гантелей сидя", sets: "2x8", muscleGroup: "Плечи" },
      {
        name: "Махи в кроссовере в стороны",
        sets: "3x отказ",
        muscleGroup: "Плечи",
      },
      { name: "Жим ногами", sets: "2x8-10", muscleGroup: "Квадрицепсы" },
      { name: "Разгибания ног", sets: "2x отказ", muscleGroup: "Квадрицепсы" },
      { name: "Румынская тяга", sets: "3x15", muscleGroup: "Бицепс бедра" },
      { name: "Подъемы на носки в Смите", sets: "3x15", muscleGroup: "Икры" },
    ],
  },
];

export async function seedDefaultTemplates(): Promise<{
  success: boolean;
  message: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Не авторизован" };
  }

  // Проверяем есть ли уже шаблоны
  const { data: existingTemplates } = await supabase
    .from("workout_templates")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (existingTemplates && existingTemplates.length > 0) {
    return { success: false, message: "Шаблоны уже существуют" };
  }

  // Получаем мышечные группы
  const { data: muscleGroups } = await supabase
    .from("muscle_groups")
    .select("id, name");

  if (!muscleGroups) {
    return { success: false, message: "Не удалось загрузить мышечные группы" };
  }

  const muscleGroupIdMap = new Map<string, number>();
  muscleGroups.forEach((mg) => {
    muscleGroupIdMap.set(mg.name, mg.id);
  });

  // Создаем упражнения и шаблоны
  for (const template of DEFAULT_TEMPLATES) {
    // Создаем шаблон
    const { data: newTemplate, error: templateError } = await supabase
      .from("workout_templates")
      .insert({
        user_id: user.id,
        name: template.name,
      })
      .select()
      .single();

    if (templateError || !newTemplate) {
      console.error("Error creating template:", templateError);
      continue;
    }

    // Создаем упражнения для шаблона
    for (let i = 0; i < template.exercises.length; i++) {
      const ex = template.exercises[i];
      const muscleGroupId = muscleGroupIdMap.get(ex.muscleGroup);

      if (!muscleGroupId) {
        console.error("Muscle group not found:", ex.muscleGroup);
        continue;
      }

      // Проверяем существует ли упражнение
      const normalizedName = ex.name.toLowerCase().trim();
      const { data: existingExercise } = await supabase
        .from("exercises")
        .select("id")
        .or(`user_id.eq.${user.id},is_global.eq.true`)
        .eq("normalized_name", normalizedName)
        .limit(1)
        .single();

      let exerciseId: string;

      if (existingExercise) {
        exerciseId = existingExercise.id;
      } else {
        // Создаем новое упражнение
        const { data: newExercise, error: exerciseError } = await supabase
          .from("exercises")
          .insert({
            user_id: user.id,
            name: ex.name,
            normalized_name: normalizedName,
            primary_muscle_group_id: muscleGroupId,
            is_global: false,
          })
          .select()
          .single();

        if (exerciseError || !newExercise) {
          console.error("Error creating exercise:", exerciseError);
          continue;
        }
        exerciseId = newExercise.id;
      }

      // Добавляем упражнение в шаблон
      await supabase.from("workout_template_exercises").insert({
        template_id: newTemplate.id,
        exercise_id: exerciseId,
        order_index: i,
      });
    }
  }

  return { success: true, message: "Шаблоны успешно созданы!" };
}
