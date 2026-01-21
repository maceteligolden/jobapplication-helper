import { configureStore } from "@reduxjs/toolkit";
import jobDescriptionReducer from "@/src/domain/slices/jobDescriptionSlice";
import cvDataReducer from "@/src/domain/slices/cvDataSlice";
import qaSessionReducer from "@/src/domain/slices/qaSessionSlice";
import generationReducer from "@/src/domain/slices/generationSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      jobDescription: jobDescriptionReducer,
      cvData: cvDataReducer,
      qaSession: qaSessionReducer,
      generation: generationReducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
