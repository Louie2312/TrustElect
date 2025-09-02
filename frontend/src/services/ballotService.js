import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetchWithAuth(url, options = {}) {
  const token = Cookies.get('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const createBallot = async (ballotData) => {
  try {
    return await fetchWithAuth('/ballots', {
      method: 'POST',
      body: JSON.stringify({
        election_id: ballotData.electionId,
        description: ballotData.description,
        positions: ballotData.positions.map(pos => ({
          name: pos.name,
          max_choices: pos.maxChoices,
          candidates: pos.candidates?.map(cand => ({
            first_name: cand.firstName,
            last_name: cand.lastName,
            party: cand.party || null,
            slogan: cand.slogan || null,
            platform: cand.platform || null,
            image_url: cand.imageUrl || null
          })) || []
        }))
      })
    });
  } catch (error) {
    throw new Error(error.message || 'Failed to create ballot');
  }
};

export const getBallot = async (ballotId) => {
  return fetchWithAuth(`/ballots/${ballotId}`);
};

export const updateBallotDescription = async (ballotId, description) => {
  return fetchWithAuth(`/ballots/${ballotId}/description`, {
    method: 'PUT',
    body: JSON.stringify({ description })
  });
};

export const deleteBallot = async (ballotId) => {
  return fetchWithAuth(`/ballots/${ballotId}`, {
    method: 'DELETE'
  });
};