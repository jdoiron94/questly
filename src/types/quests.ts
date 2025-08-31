export type Quest = {
  name: string
  quest_points: number
  requirements: QuestRequirements
}

export type QuestRequirements = {
  quests?: string[]
  skills?: string[]
  quest_points?: number
  members?: boolean
}
