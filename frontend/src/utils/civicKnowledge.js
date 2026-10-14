/**
 * CivicTrack Municipal Knowledge Base & Intent Classification Engine
 * Provides deterministic NLP query analysis, department routing, and SLA guidance.
 */

export const MUNICIPAL_DEPARTMENTS = [
  {
    name: 'Roads',
    label: 'Roads & Infrastructure',
    icon: '🛣️',
    color: '#f59e0b',
    sla: '48 to 72 Hours',
    phone: '1800-425-7623',
    keywords: ['road', 'pothole', 'crater', 'tar', 'street', 'footpath', 'divider', 'traffic light', 'manhole', 'speed breaker', 'asphalt'],
    description: 'Pothole repairs, resurfacing, damaged footpaths, median maintenance, and broken kerbs.',
  },
  {
    name: 'Water Supply',
    label: 'Water Supply & Sewage',
    icon: '🚰',
    color: '#0284c7',
    sla: '12 to 24 Hours',
    phone: '1916 (Toll-Free)',
    keywords: ['water', 'pipe', 'leak', 'drain', 'drainage', 'sewage', 'pipeline', 'tap', 'drinking', 'contamination', 'overflow', 'pressure'],
    description: 'Pipeline bursts, contaminated tap water, low water pressure, blocked drains, and sewage overflows.',
  },
  {
    name: 'Waste Management',
    label: 'Waste Management & Sanitation',
    icon: '🗑️',
    color: '#10b981',
    sla: '12 to 24 Hours',
    phone: '1969 (Swachh Bharat)',
    keywords: ['garbage', 'trash', 'waste', 'dump', 'bin', 'plastic', 'clean', 'sanitation', 'litter', 'debris', 'dead animal', 'stench', 'smell'],
    description: 'Overflowing public dumpsters, uncollected garbage, illegal dumping, street sweeping, and bio-waste removal.',
  },
  {
    name: 'Electricity',
    label: 'Electricity & Streetlighting',
    icon: '💡',
    color: '#8b5cf6',
    sla: '12 to 24 Hours',
    phone: '1912 (Urja Mitra)',
    keywords: ['light', 'streetlight', 'electric', 'power', 'wire', 'spark', 'transformer', 'pole', 'blackout', 'lamp', 'hanging wire', 'short circuit'],
    description: 'Dark or flickering streetlights, exposed live wires, transformer sparking, leaning electric poles, and power hazards.',
  },
];

export const MUNICIPAL_HELPLINES = [
  { name: 'City Municipal Control Room', number: '1800-425-0033', timing: '24/7 Toll-Free' },
  { name: 'Water & Sewage Emergency', number: '1916', timing: '24/7 Emergency Line' },
  { name: 'Electricity & Power Outages', number: '1912', timing: '24/7 Helpline' },
  { name: 'Swachh Bharat Cleanliness', number: '1969', timing: '6:00 AM - 10:00 PM' },
  { name: 'Disaster Management Cell', number: '1077', timing: '24/7 Emergency Line' },
  { name: 'Women Safety / Citizen Distress', number: '1091 / 112', timing: '24/7 Emergency Line' },
];

export const QUICK_PROMPTS = [
  { label: '🚰 Water Leakage', query: 'I want to report a broken water pipe leaking on the road' },
  { label: '🛣️ Road Pothole', query: 'Dangerous deep pothole on the main street needs urgent repair' },
  { label: '🗑️ Garbage Overflow', query: 'Municipal garbage bin is overflowing with waste and bad smell' },
  { label: '💡 Streetlight Fault', query: 'Streetlight pole is not working and area is completely dark' },
  { label: '🔍 Check Status', query: 'How do I check the status of my reported complaint?' },
  { label: '📞 Emergency Helplines', query: 'Show me emergency municipal contact numbers and helplines' },
];

/**
 * Analyzes citizen query using keyword taxonomy and intent extraction.
 * Returns structured response with pre-fill options and actionable buttons.
 */
export function analyzeCivicQuery(rawQuery, context = {}) {
  const query = (rawQuery || '').trim();
  const lower = query.toLowerCase();

  // 1. Check for Issue ID pattern (e.g. 24 hex characters)
  const hexMatch = query.match(/[0-9a-fA-F]{24}/);
  if (hexMatch) {
    const issueId = hexMatch[0];
    return {
      text: `I detected Issue Reference ID **${issueId}**.\n\nYou can view its real-time resolution timeline and official audit comments directly:`,
      actionType: 'view_issue',
      actionUrl: `/issues/${issueId}`,
      actionText: `🔍 View Issue #${issueId.slice(-6)} Details`,
      chips: ['Check Another Issue', 'Report New Issue', 'Contact Department'],
    };
  }

  // 2. Greetings
  if (/^(hi|hello|hey|namaste|vanakkam|good\s*(morning|afternoon|evening)|start)/i.test(lower)) {
    return {
      text: "Hello! I am **CivicBot**, your 24/7 City Municipal Assistant.\n\nI can help you:\n• **File a new grievance** (roads, water, waste, electricity)\n• **Track status & resolution timeline** of your complaints\n• **Find department SLAs** and emergency helplines.\n\nHow may I assist you today?",
      chips: ['🚰 Report Water Leak', '🛣️ Report Road Pothole', '🗑️ Garbage Overflow', '💡 Streetlight Fault'],
    };
  }

  // 3. Helplines & Emergency Contacts
  if (lower.includes('helpline') || lower.includes('phone') || lower.includes('contact') || lower.includes('emergency') || lower.includes('call') || lower.includes('number')) {
    let helplineText = "Here are the verified municipal emergency helplines:\n\n";
    MUNICIPAL_HELPLINES.forEach((h) => {
      helplineText += `• **${h.name}**: \`${h.number}\` (${h.timing})\n`;
    });
    helplineText += "\nFor urgent life-threatening hazards, dial **112** immediately.";
    return {
      text: helplineText,
      chips: ['Report Electricity Hazard', 'Water Supply Issue', 'Check SLA Times'],
    };
  }

  // 4. Status Check / My Reports
  if (lower.includes('status') || lower.includes('track') || lower.includes('my report') || lower.includes('check complaint')) {
    return {
      text: "You can track your reported grievances in real-time under **'My Reports'** in the navigation bar.\n\nIf you have a 24-character Issue ID, simply type it here (e.g., `status 65df...`) and I will look up the official department audit notes for you!",
      actionType: 'navigate',
      actionUrl: '/my-reports',
      actionText: '📋 Open My Reports Tracker',
      chips: ['Report New Issue', 'Emergency Helplines', 'Department SLA'],
    };
  }

  // 5. Department SLA & Turnaround Times
  if (lower.includes('sla') || lower.includes('turnaround') || lower.includes('how long') || lower.includes('time') || lower.includes('resolve') || lower.includes('duration')) {
    let slaText = "Here are the official Municipal Department Resolution SLAs:\n\n";
    MUNICIPAL_DEPARTMENTS.forEach((dept) => {
      slaText += `• ${dept.icon} **${dept.name}**: ${dept.sla} (Call: \`${dept.phone}\`)\n`;
    });
    slaText += "\nPriority **Emergency** complaints are triaged on ground within 2 hours.";
    return {
      text: slaText,
      chips: ['Report High Priority Issue', 'View Municipal Feed', 'Emergency Helplines'],
    };
  }

  // 6. Match specific municipal category by keywords
  let matchedDept = null;
  let maxKeywordHits = 0;

  for (const dept of MUNICIPAL_DEPARTMENTS) {
    let hits = 0;
    for (const kw of dept.keywords) {
      if (lower.includes(kw)) {
        hits++;
      }
    }
    if (hits > maxKeywordHits) {
      maxKeywordHits = hits;
      matchedDept = dept;
    }
  }

  if (matchedDept && maxKeywordHits > 0) {
    // Determine priority suggestion based on urgency terms
    let priority = 'Medium';
    if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('burst') || lower.includes('spark') || lower.includes('live wire') || lower.includes('accident')) {
      priority = 'Emergency';
    } else if (lower.includes('deep') || lower.includes('danger') || lower.includes('overflow') || lower.includes('blocked') || lower.includes('hazard') || lower.includes('major')) {
      priority = 'High';
    }

    const titleParam = encodeURIComponent(query.slice(0, 60));
    const prefillUrl = `/report?category=${encodeURIComponent(matchedDept.name)}&priority=${priority}&title=${titleParam}`;

    return {
      text: `I've analyzed your complaint:\n\n` +
        `• **Assigned Department:** ${matchedDept.icon} **${matchedDept.name}**\n` +
        `• **Suggested Priority:** **${priority}**\n` +
        `• **Official SLA Target:** ${matchedDept.sla}\n` +
        `• **Direct Helpline:** \`${matchedDept.phone}\`\n\n` +
        `Would you like to file this issue on the official GIS transparency map?`,
      category: matchedDept.name,
      priority,
      actionType: 'report',
      actionUrl: prefillUrl,
      actionText: `📝 Proceed to File ${matchedDept.name} Complaint`,
      chips: ['Check Department SLA', 'Emergency Helplines', 'Browse City Map'],
    };
  }

  // 7. Fallback Response
  return {
    text: "I can help route your civic complaint directly to the responsible municipal department (Roads, Water Supply, Waste Management, Electricity) and provide emergency contacts.\n\nPlease describe the issue (e.g. 'Water pipe burst in my street' or 'Streetlights are out') or choose a quick option below:",
    chips: ['🚰 Water Leakage', '🛣️ Road Pothole', '🗑️ Garbage Overflow', '💡 Streetlight Fault', '📞 Helplines'],
  };
}
