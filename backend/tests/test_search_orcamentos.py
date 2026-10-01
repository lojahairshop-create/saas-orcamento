import pytest
from unittest.mock import MagicMock, patch
from app.orcamentos.service import list_orcamentos

@pytest.mark.asyncio
async def test_busca_numero_cliente_com_caracteres_especiais():
    # Mock do supabase
    mock_supabase = MagicMock()
    mock_query = MagicMock()
    
    # Configura a chain: table -> select -> eq -> or_ -> range -> order -> execute
    mock_supabase.table.return_value = mock_query
    mock_query.select.return_value = mock_query
    mock_query.eq.return_value = mock_query
    mock_query.order.return_value = mock_query
    mock_query.or_.return_value = mock_query
    mock_query.range.return_value = mock_query
    
    # Mock do retorno
    mock_response = MagicMock()
    mock_response.data = [{"id": "1", "numero": "123", "cliente_nome": "Teste"}]
    mock_response.count = 1
    mock_query.execute.return_value = mock_response
    
    with patch("app.orcamentos.service.get_supabase_service_client", return_value=mock_supabase):
        # A. Busca normal por numero ou cliente
        await list_orcamentos(user_id="user1", search="123")
        mock_query.or_.assert_called_with('numero.ilike."%123%",cliente_nome.ilike."%123%"')
        
        # D. Vrgula
        await list_orcamentos(user_id="user1", search="A,B")
        mock_query.or_.assert_called_with('numero.ilike."%A,B%",cliente_nome.ilike."%A,B%"')
        
        # E. Parnteses
        await list_orcamentos(user_id="user1", search="(TESTE)")
        mock_query.or_.assert_called_with('numero.ilike."%(TESTE)%",cliente_nome.ilike."%(TESTE)%"')
        
        # F. Aspas
        await list_orcamentos(user_id="user1", search='O"BRIEN')
        mock_query.or_.assert_called_with('numero.ilike."%O\\"BRIEN%",cliente_nome.ilike."%O\\"BRIEN%"')
        
        # G. Percentual literal (escapado)
        await list_orcamentos(user_id="user1", search="100%")
        mock_query.or_.assert_called_with('numero.ilike."%100\\%%",cliente_nome.ilike."%100\\%%"')
        
        # H. Underscore literal (escapado)
        await list_orcamentos(user_id="user1", search="A_B")
        mock_query.or_.assert_called_with('numero.ilike."%A\\_B%",cliente_nome.ilike."%A\\_B%"')
        
        # I. Espaos
        await list_orcamentos(user_id="user1", search=" ABC ")
        # O service d strip(), ento " ABC " -> "ABC"
        mock_query.or_.assert_called_with('numero.ilike."%ABC%",cliente_nome.ilike."%ABC%"')
        
        # J. Search vazio ou s espaos
        mock_query.or_.reset_mock()
        await list_orcamentos(user_id="user1", search="   ")
        mock_query.or_.assert_not_called()
        
        # K e L. Paginao
        await list_orcamentos(user_id="user1", search="Teste", page=2, per_page=10)
        mock_query.range.assert_called_with(10, 19)
        
        # M. Verifica se created_by e search convivem
        mock_query.eq.assert_any_call("created_by", "user1")
