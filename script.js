// Constantes e Variáveis Globais
const POKEDEX_LIST_ELEMENT = document.getElementById('pokedexList');
const STATUS_MESSAGE_ELEMENT = document.getElementById('statusMessage');
const PREV_BUTTON = document.getElementById('prevPageButton');
const NEXT_BUTTON = document.getElementById('nextPageButton');
const SEARCH_INPUT = document.getElementById('searchInput');
const SEARCH_BUTTON = document.getElementById('searchButton');
const DETAILS_MODAL = document.getElementById('pokemonDetails');
const CLOSE_DETAILS_BUTTON = document.getElementById('closeDetailsButton');
const DETAILS_CONTENT = DETAILS_MODAL.querySelector('.modal-content');
const PAGINATION_CONTROLS = document.getElementById('paginationControls');

// URLs de navegação paginada
let currentUrl = 'https://pokeapi.co/api/v2/pokemon?limit=20&offset=0';
let nextUrl = null;
let prevUrl = null;
let isSearching = false; // Flag para controlar o estado de busca

// Objeto para mapear tipos a cores
const TYPE_COLORS = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', steel: '#B7B7CE',
    fairy: '#D685AD', dark: '#705746',
};

// ----------------------------------------------------
// Funções de Utilidade (UI)
// ----------------------------------------------------

function showStatusMessage(message, isError = false) {
    STATUS_MESSAGE_ELEMENT.textContent = message;
    STATUS_MESSAGE_ELEMENT.classList.remove('hidden');
    STATUS_MESSAGE_ELEMENT.style.color = isError ? 'red' : 'var(--secondary-color)';
    POKEDEX_LIST_ELEMENT.innerHTML = '';
}

function hideStatusMessage() {
    STATUS_MESSAGE_ELEMENT.classList.add('hidden');
}

/**
 * Controla a visibilidade dos botões de navegação.
 * @param {boolean} show Se deve mostrar os controles de paginação.
 */
function togglePaginationControls(show) {
    PAGINATION_CONTROLS.style.display = show ? 'flex' : 'none';
}

// ----------------------------------------------------
// Funções de API (Listagem e Paginação)
// ----------------------------------------------------

/**
 * Busca a lista de Pokémon na URL fornecida.
 * @param {string} url O endpoint da PokeAPI.
 */
async function fetchPokemonList(url) {
    isSearching = false; // Volta ao modo de listagem
    showStatusMessage('Carregando Pokémon...');
    togglePaginationControls(false); // Oculta a navegação durante o carregamento

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro HTTP! Status: ${response.status}`);
        }
        const data = await response.json();

        // 1. CORREÇÃO DA PAGINAÇÃO: Salva as URLs
        nextUrl = data.next;
        prevUrl = data.previous;

        // 2. Habilita/Desabilita botões e mostra os controles
        PREV_BUTTON.disabled = !prevUrl;
        NEXT_BUTTON.disabled = !nextUrl;
        togglePaginationControls(true);

        POKEDEX_LIST_ELEMENT.innerHTML = '';
        hideStatusMessage();

        // Mapeia os resultados para buscar detalhes de cada Pokémon
        const detailPromises = data.results.map(pokemon => fetchPokemonDetails(pokemon.url));
        const detailedPokemon = await Promise.all(detailPromises);

        renderPokemonCards(detailedPokemon);

    } catch (error) {
        console.error('Erro ao buscar lista de Pokémon:', error);
        showStatusMessage('Falha ao carregar a Pokédex. Tente novamente mais tarde.', true);
        togglePaginationControls(false);
    }
}

/**
 * Busca detalhes de um único Pokémon pela URL.
 */
async function fetchPokemonDetails(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Em caso de erro na sub-requisição, retorna null
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar detalhes do Pokémon:', url, error);
        return null;
    }
}

/**
 * Busca detalhes de um único Pokémon pelo nome/ID (Usado na busca).
 */
async function fetchPokemonByNameOrId(query) {
    try {
        const nameOrId = String(query).toLowerCase();
        const url = `https://pokeapi.co/api/v2/pokemon/${nameOrId}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Pokémon não encontrado.');
        }

        return await response.json();
    } catch (error) {
        console.error('Erro na busca:', error);
        return null;
    }
}

// ----------------------------------------------------
// Funções de Renderização (Manipulação do DOM)
// ----------------------------------------------------

/**
 * Cria e insere os cards de Pokémon na lista.
 */
function renderPokemonCards(pokemonArray) {
    const validPokemon = pokemonArray.filter(p => p !== null);

    if (validPokemon.length === 0 && !isSearching) {
        showStatusMessage('Nenhum Pokémon encontrado.', false);
        togglePaginationControls(false);
        return;
    }

    POKEDEX_LIST_ELEMENT.innerHTML = '';

    validPokemon.forEach(pokemon => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.setAttribute('data-id', pokemon.id);
        card.addEventListener('click', () => showPokemonDetails(pokemon));

        // Imagem
        const img = document.createElement('img');
        img.src = pokemon.sprites.front_default || 'placeholder.png';
        img.alt = pokemon.name;
        card.appendChild(img);

        // ID
        const id = document.createElement('p');
        id.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
        card.appendChild(id);

        // Nome
        const name = document.createElement('h3');
        name.textContent = pokemon.name;
        card.appendChild(name);

        // Tipos
        const typesContainer = document.createElement('div');
        pokemon.types.forEach(typeInfo => {
            const badge = document.createElement('span');
            badge.className = 'type-badge';
            badge.textContent = typeInfo.type.name;
            badge.style.backgroundColor = TYPE_COLORS[typeInfo.type.name] || '#666';
            typesContainer.appendChild(badge);
        });
        card.appendChild(typesContainer);

        POKEDEX_LIST_ELEMENT.appendChild(card);
    });
}

/**
 * Cria e exibe o modal com os detalhes completos do Pokémon.
 */
function showPokemonDetails(pokemon) {
    // Limpa o conteúdo e recria a estrutura
    DETAILS_CONTENT.innerHTML = ''; 

    // Botão de fechar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-modal';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', hidePokemonDetails);
    DETAILS_CONTENT.appendChild(closeBtn);
    
    // Título e ID
    const headerDiv = document.createElement('div');
    headerDiv.className = 'details-header';
    headerDiv.innerHTML = `
        <h2>${pokemon.name}</h2>
        <p>#${String(pokemon.id).padStart(3, '0')}</p>
    `;
    DETAILS_CONTENT.appendChild(headerDiv);

    // Imagem
    const imageDiv = document.createElement('div');
    imageDiv.className = 'details-image';
    imageDiv.innerHTML = `<img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}">`;
    DETAILS_CONTENT.appendChild(imageDiv);

    // Lista de Informações
    const infoList = document.createElement('ul');
    infoList.className = 'details-info';
    
    // Tipos
    let typesHtml = '';
    pokemon.types.forEach(typeInfo => {
        const color = TYPE_COLORS[typeInfo.type.name] || '#666';
        typesHtml += `<span class="type-badge" style="background-color: ${color};">${typeInfo.type.name}</span>`;
    });
    infoList.innerHTML += `<li><strong>Tipo(s):</strong> ${typesHtml}</li>`;
    
    // Altura e Peso
    infoList.innerHTML += `
        <li><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</li>
        <li><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</li>
    `;
    DETAILS_CONTENT.appendChild(infoList);

    DETAILS_MODAL.classList.remove('hidden');
}

/**
 * Oculta o modal de detalhes do Pokémon.
 */
function hidePokemonDetails() {
    DETAILS_MODAL.classList.add('hidden');
}


// ----------------------------------------------------
// Funções de Funcionalidades (Busca)
// ----------------------------------------------------

/**
 * Busca e exibe um Pokémon específico pelo nome/ID.
 */
async function handleSearch() {
    const query = SEARCH_INPUT.value.trim().toLowerCase();
    if (!query) {
        // Se a busca estiver vazia, volta para a lista inicial
        fetchPokemonList(currentUrl);
        return;
    }
    
    isSearching = true;
    showStatusMessage(`Buscando por "${query}"...`);
    togglePaginationControls(false); // Esconde navegação na busca

    const pokemon = await fetchPokemonByNameOrId(query);

    if (pokemon) {
        renderPokemonCards([pokemon]);
        hideStatusMessage();
    } else {
        showStatusMessage(`Nenhum Pokémon encontrado com o nome/ID: "${query}".`, false);
    }
}


// ----------------------------------------------------
// Inicialização e Event Listeners
// ----------------------------------------------------

function setupEventListeners() {
    // Paginação
    NEXT_BUTTON.addEventListener('click', () => {
        if (nextUrl) {
            fetchPokemonList(nextUrl);
        }
    });

    PREV_BUTTON.addEventListener('click', () => {
        if (prevUrl) {
            fetchPokemonList(prevUrl);
        }
    });

    // Busca
    SEARCH_BUTTON.addEventListener('click', handleSearch);
    SEARCH_INPUT.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Fechar Modal
    CLOSE_DETAILS_BUTTON.addEventListener('click', hidePokemonDetails);
    DETAILS_MODAL.addEventListener('click', (e) => {
        if (e.target === DETAILS_MODAL) {
            hidePokemonDetails();
        }
    });
}

// Início da Aplicação
setupEventListeners();
fetchPokemonList(currentUrl); // Lista inicial de Pokémon