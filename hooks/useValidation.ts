import { UserSettings } from '@/types/settings';

type ValidationRule = {
  validate: (value: any) => boolean;
  message: string;
};

type ValidationRules = {
  [K in keyof UserSettings]?: ValidationRule[];
};

export const useValidation = () => {
  const rules: ValidationRules = {
    portionsPerCan: [
      {
        validate: (value) => value >= 1 && value <= 50,
        message: 'Antal portioner måste vara mellan 1 och 50'
      }
    ],
    dailyIntake: [
      {
        validate: (value) => value >= 1 && value <= 50,
        message: 'Dagligt intag måste vara mellan 1 och 50 portioner'
      }
    ],
    costPerCan: [
      {
        validate: (value) => value >= 1 && value <= 1000,
        message: 'Pris måste vara mellan 1 och 1000 kr'
      }
    ],
    snusTime: [
      {
        validate: (value) => value >= 1 && value <= 120,
        message: 'Snustid måste vara mellan 1 och 120 minuter'
      }
    ],
    waitTime: [
      {
        validate: (value) => value >= 1 && value <= 240,
        message: 'Väntetid måste vara mellan 1 och 240 minuter'
      }
    ],
    nicotineContent: [
      {
        validate: (value) => value >= 0 && value <= 50,
        message: 'Nikotinhalt måste vara mellan 0 och 50 mg'
      }
    ]
  };

  const validateField = (field: keyof UserSettings, value: any): string | null => {
    const fieldRules = rules[field];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      if (!rule.validate(value)) {
        return rule.message;
      }
    }

    return null;
  };

  const validateSettings = (settings: Partial<UserSettings>): string | null => {
    for (const [field, value] of Object.entries(settings)) {
      const error = validateField(field as keyof UserSettings, value);
      if (error) return error;
    }

    // Validera målvärden om målet är att minska
    if (settings.goal === 'reduce') {
      if (settings.targetDailyIntake && settings.dailyIntake) {
        if (settings.targetDailyIntake >= settings.dailyIntake) {
          return 'Målvärdet för daglig konsumtion måste vara lägre än nuvarande';
        }
      }
      
      if (settings.targetWaitTime && settings.waitTime) {
        if (settings.targetWaitTime <= settings.waitTime) {
          return 'Målvärdet för väntetid måste vara högre än nuvarande';
        }
      }
      
      if (settings.targetSnusTime && settings.snusTime) {
        if (settings.targetSnusTime >= settings.snusTime) {
          return 'Målvärdet för snustid måste vara lägre än nuvarande';
        }
      }
    }

    return null;
  };

  return {
    validateField,
    validateSettings
  };
};