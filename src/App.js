/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'

import Beforeunload from 'react-beforeunload'
import LoadingOverlay from 'react-loading-overlay'
import BarLoader from 'react-spinners/BarLoader'

import './App.css'

const json = require('./quests.json')

const CORS_ANYWHERE_URL = 'https://cors-anywhere.herokuapp.com/'
const HISCORE_URL = 'http://services.runescape.com/m=hiscore_oldschool/index_lite.ws?player='

const SKILLS = [
  'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged', 'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching',
  'Fishing', 'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecraft', 'Hunter', 'Construction'
]

let encodedUsername = null

function App() {
  const [initializing, setInitializing] = useState(true)
  const [username, setUsername] = useState(null)
  const [members, setMembers] = useState(true)
  const [levels, setLevels] = useState(null)
  const [completed, setCompleted] = useState([])
  const [completable, setCompletable] = useState(json.quests.slice(0))
  const [incompletable, setIncompletable] = useState([])
  const [questPoints, setQuestPoints] = useState(0)
  const [spinnerActive, setSpinnerActive] = useState(false)
  const [error, setError] = useState(false)

  // After app has mounted, attempt to read stats from local storage
  useEffect(() => {
    readFromStorage()
  }, [])

  // After membership status changes or data is read from local storage, update table
  useEffect(() => {
    if (!initializing) {
      updateQuests(true)
    } else {
      setInitializing(false)
    }
  }, [members])

  // After levels change, attempt to read stats for user and update table
  useEffect(() => {
    if (levels !== null) {
      readFromStorage()
      updateQuests(true)
    }
  }, [levels])

  // After username changes, remove error message if visible
  useEffect(() => {
    if (error) {
      setError(false)
    }
  }, [username])

  // After a quest is removed, update completed quest points
  useEffect(() => {
    updateQuestPoints()
  }, [completed])

  // After quest point value changes, update quest table
  useEffect(() => {
    updateQuests(false)
  }, [questPoints])

  // After spinner state changes, modify body class to control scroll lock state
  useEffect(() => {
    const body = document.getElementById('body')
    if (spinnerActive) {
      window.scrollTo(0, 0)
      body.classList.add('prevent-scroll')
    } else {
      body.classList.remove('prevent-scroll')
    }
  }, [spinnerActive])

  return <Beforeunload onBeforeunload={saveToStorage}>
    <LoadingOverlay classNamePrefix={'spinner-'} active={spinnerActive} spinner={<BarLoader />} text="Loading your levels"
      styles={{
        // Override default spinner wrapper styles so it renders
        wrapper: {},
        content: {
          width: '200px',
          margin: 'auto'
        }
      }}>
      <div className="App">
        <div id="nav-sticky" uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; bottom: #transparent-sticky-navbar">
          <nav className="uk-navbar-container uk-margin" data-uk-navbar>
            <div className="uk-navbar-left">
              <div className="uk-navbar-item uk-logo">Questly</div>
              <div className="uk-navbar-item">
                <input className="uk-input uk-form-width-medium" type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
              <div className="uk-navbar-item">
                <button className="uk-button uk-button-primary" onClick={fetchLevels}>Submit</button>
              </div>
              <div className="uk-navbar-item">
                <label>
                  <input className="uk-checkbox uk-mr-mini" type="checkbox" checked={members} disabled={levels === null} onClick={toggleMembers} />
                  Members
                </label>
              </div>
              <div className="uk-navbar-item">QP: {questPoints}</div>
            </div>
          </nav>
        </div>
        {renderErrorMessage()}
        <table className="uk-table uk-table-divider">
          <thead data-uk-scrollspy="cls:uk-animation-slide-top">
            <tr>
              <th>Quest</th>
              <th>Prerequisites</th>
              <th>Level Requirements</th>
              <th>Quest Points</th>
            </tr>
          </thead>
          {renderAllQuests()}
        </table>
      </div>
    </LoadingOverlay>
  </Beforeunload>

function renderErrorMessage() {
  return !error ? null : (
    <div id="error" data-uk-alert>
      <div className="uk-alert uk-alert-warning">
        <button className="uk-alert-close uk-icon uk-close link-button" onClick={() => setError(false)}>
          <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" data-svg="close-icon">
            <line fill="none" stroke="#000" strokeWidth="1.1" x1="1" y1="1" x2="13" y2="13"></line>
            <line fill="none" stroke="#000" strokeWidth="1.1" x1="13" y1="1" x2="1" y2="13"></line>
          </svg>
        </button>
        <p>No player could be found with the username <span className="bold">{username}</span>.</p>
      </div>
    </div>
  )
}

  function renderAllQuests() {
    return (
      <tbody>
        {renderQuests(completable, 'completable', 'Done', e => addToCompleted(e))}
        {renderQuests(incompletable, 'incompletable', 'Done', e => addToCompleted(e))}
        {renderQuests(completed, 'completed', 'Remove', e => removeFromCompleted(e))}
      </tbody>
    )
  }

  function renderQuests(quests, className, buttonText, buttonCallback) {
    return quests.map((quest, i) => (
      <tr key={i} className={className} data-uk-scrollspy="cls:uk-animation-fast uk-animation-fade">
        <td>{quest.name}</td>
        <td>{renderPrerequisites(quest.requirements.quests, quest.requirements.quest_points)}</td>
        <td>{renderPrerequisites(quest.requirements.skills, null)}</td>
        <td>{quest.quest_points}</td>
        <td><button className="uk-button" onClick={() => buttonCallback(quest)}>{buttonText}</button></td>
      </tr>
    ))
  }

  function renderPrerequisites(reqs, questPointReq) {
    const localReqs = reqs ? reqs.slice(0) : []
    if (questPointReq) {
      localReqs.unshift(`${questPointReq} QP`)
    }
    return localReqs.length === 0 ? null : (
      <ul className="uk-list">
        {localReqs.map((req, i) => {
          if (req.toString().includes('||')) {
            req = req.split('||').join('or')
          }
          return (<li key={i}>{req}</li>)
        })}
      </ul>
    )
  }

  function hasOneOf(requirement, isSkill) {
    const requirements = requirement.split(' || ')
    if (isSkill) {
      for (let req of requirements) {
        const split = req.split(' ')
        const level = parseInt(split[0])
        const skillIndex = SKILLS.indexOf(split[1])
        if (levels[skillIndex] >= level) {
          return true
        }
      }
    } else {
      for (let req of requirements) {
        if (completed.find(q => q.name.toUpperCase() === req.toUpperCase())) {
          return true
        }
      }
    }
    return false
  }

  function hasSkillRequirements(requirements) {
    if (requirements === undefined || levels === null) {
      return true
    }
    for (let skill of requirements) {
      if (skill.includes('||')) {
        return hasOneOf(skill, true)
      }
      const split = skill.split(' ')
      const level = parseInt(split[0])
      const index = SKILLS.indexOf(split[1])
      if (levels[index] < level) {
        return false
      }
    }
    return true
  }

  function hasQuestPointRequirement(requirement) {
    return requirement === undefined || questPoints >= requirement
  }

  function hasPrerequisites(requirements) {
    if (requirements === undefined) {
      return true
    }
    for (let quest of requirements) {
      if (quest.includes('||')) {
        return hasOneOf(quest)
      }
      if (!completed.find(q => q.name.toUpperCase() === quest.toUpperCase())) {
        return false
      }
    }
    return true
  }

  function hasQuestEligibility(requirement) {
    return requirement === undefined || requirement === members
  }

  function canCompleteQuest(quest, checkSkills) {
    if (hasQuestEligibility(quest.requirements.members)) {
      const hasQuests = hasPrerequisites(quest.requirements.quests)
      const hasQuestPoints = hasQuestPointRequirement(quest.requirements.quest_points)
      return hasQuests && hasQuestPoints && (!checkSkills || hasSkillRequirements(quest.requirements.skills))
    }
    return false
  }

  function updateQuests(checkSkills) {
    const completable = []
    const incompletable = []
    for (let quest of json.quests) {
      if (!completed.find(q => q.name.toUpperCase() === quest.name.toUpperCase())) {
        if (canCompleteQuest(quest, checkSkills)) {
          completable.push(quest)
        } else {
          incompletable.push(quest)
        }
      }
    }
    setCompletable(completable.sort(compareQuests))
    setIncompletable(incompletable.sort(compareQuests))
    if (spinnerActive) {
      setSpinnerActive(false)
    }
  }

  function addAllToCompleted(quest) {
    if (quest.requirements.quests) {
      for (let q of quest.requirements.quests) {
        const req = json.quests.find(j => j.name === q)
        if (!completed.find(q => q.name.toUpperCase() === req.name.toUpperCase())) {
          completed.push(req)
        }
        addAllToCompleted(req)
      }
    }
  }

  function addToCompleted(quest) {
    if (!completed.find(q => q.name.toUpperCase() === quest.name.toUpperCase())) {
      addAllToCompleted(quest)
      completed.push(quest)
      completed.sort(compareQuests)
      updateQuestPoints()
    }
  }

  function removeFromCompleted(quest) {
    if (levels === null || canCompleteQuest(quest)) {
      completable.push(quest)
      completable.sort(compareQuests)
    } else {
      incompletable.push(quest)
      incompletable.sort(compareQuests)
    }
    setCompleted(completed.filter(q => q !== quest).sort(compareQuests))
  }

  function compareQuests(x, y) {
    return x.name.localeCompare(y.name)
  }

  function toggleMembers() {
    setMembers(!members)
  }

  function updateQuestPoints() {
    let points = 0
    for (let quest of completed) {
      const current = json.quests.find(q => q.name.toUpperCase() === quest.name.toUpperCase())
      points += current.quest_points
    }
    setQuestPoints(points)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      fetchLevels()
    }
  }

  function fetchLevels() {
    if (username && username.trim().length !== 0) {
      setSpinnerActive(true)
      saveToStorage()
      encodedUsername = encodeURIComponent(username)
      const fullUrl = CORS_ANYWHERE_URL + HISCORE_URL + encodedUsername
      fetch(fullUrl)
        .then(res => {
          if (!res.ok || res.status !== 200) {
            throw new Error('Player not found')
          } else {
            return res.text()
          }
        })
        .then(res => {
          parseLevels(res)
        })
        .catch(err => {
          console.error(err)
          setSpinnerActive(false)
          setError(true)
        })
    }
  }

  function parseLevels(data) {
    const split = data.split('\n')
    const levels = []
    for (let i = 1; i < 24; i++) {
      const level = parseInt(split[i].split(',')[1])
      levels.push(level)
    }
    setLevels(levels)
  }

  function readFromStorage() {
    if (typeof (Storage) !== 'undefined') {
      const user = (encodedUsername === null ? 'default' : encodedUsername)
      const data = JSON.parse(localStorage.getItem(`quest_data_${user}`))
      if (data !== null) {
        let completed = []
        for (let current of data.quests) {
          const quest = json.quests.filter(q => q.name.toUpperCase() === current.toUpperCase())
          completed = completed.concat(quest)
        }
        setMembers(data.members)
        setCompleted(completed.sort(compareQuests))
      } else {
        setMembers(true)
        setCompleted([])
      }
    }
  }

  function saveToStorage() {
    if (typeof (Storage) !== 'undefined') {
      const data = {
        members: members,
        quests: completed.map(q => q.name)
      }
      const user = (encodedUsername === null ? 'default' : encodedUsername)
      localStorage.setItem(`quest_data_${user}`, JSON.stringify(data))
    }
  }
}

export default App
